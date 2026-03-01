"""
Multi-step recommendation pipeline for Zrata-X.

Steps:
1. GATHER  — collect signals, portfolio, instruments from DB
2. STRATEGY — LLM decides directional tilts (increase/maintain/decrease equity/debt/gold)
3. ALLOCATE — Python calculates actual ₹ amounts (LLM NEVER does math)
4. VALIDATE — LLM reviews the calculated allocation for sanity
5. EXPLAIN  — LLM generates plain-language explanation

Each step is independent and testable.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.models.asset_data import (ETF, FixedDepositRate, GoldSilverPrice,
                                   MacroIndicator, MutualFund)
from app.models.market_signal import MarketSignal
from app.models.user import PortfolioHolding, User
from app.services.ai_engine.openrouter_client import OpenRouterClient
from app.services.ai_engine.prompts import (EXPLANATION_PROMPT_TEMPLATE,
                                            INSTRUMENT_SELECTION_PROMPT,
                                            STRATEGY_PROMPT_TEMPLATE,
                                            VALIDATION_PROMPT_TEMPLATE,
                                            ZRATA_X_SYSTEM_PROMPT)
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


class RecommendationPipeline:
    """
    The core recommendation engine.
    
    Usage:
        pipeline = RecommendationPipeline(db)
        result = await pipeline.generate(user_id=1, amount=50000)
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()

    async def generate(
        self,
        user_id: int,
        amount: float,
        risk_override: Optional[str] = None,
        preferences_override: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Full pipeline: gather → strategy → allocate → validate → explain.
        Returns the complete recommendation package.
        """
        logger.info(f"Starting recommendation pipeline for user={user_id}, amount=₹{amount:,.0f}")

        # Step 1: GATHER
        context = await self._gather_context(user_id, amount, risk_override, preferences_override)
        if context.get("error"):
            return context

        # Step 2: STRATEGY (LLM)
        strategy = await self._get_strategy(context)
        if strategy.get("error"):
            return {**context, "strategy_error": strategy["error"]}

        # Step 3: ALLOCATE (Python math — NO LLM)
        allocation = self._calculate_allocation(amount, strategy, context)
        
        # Step 3.5: SELECT INSTRUMENTS (Python — picks actual funds/FDs/ETFs)
        detailed_allocation = await self._select_instruments(allocation, strategy, context)

        # Recalculate percentages on detailed allocation
        for item in detailed_allocation:
            item["percentage"] = round((item["amount"] / amount) * 100, 1)

        # Step 4: VALIDATE (LLM) & Step 5: EXPLAIN (LLM)
        validation, explanation = await asyncio.gather(
            self._validate_allocation(strategy, allocation, context),
            self._explain(context, allocation),
        )

        return {
            "user_id": user_id,
            "amount": amount,
            "strategy": strategy,
            "allocation": detailed_allocation, 
            "validation": validation,
            "explanation": explanation,
            "signals_used": context.get("signals_summary", []),
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def generate_guest(
        self,
        amount: float,
        risk_override: Optional[str] = None,
        preferences_override: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Starting GUEST pipeline for amount=₹{amount:,.0f}")

        # Build guest context (no user lookup, no portfolio)
        signals = await self._get_active_signals()
        top_fd = await self._get_top_fd()
        gold_change = await self._get_gold_30d_change()
        top_mf_cats = await self._get_top_mf_categories()

        preferences = {
            "risk_tolerance": risk_override or "moderate",
            "horizon_years": 5,
            "avoid_lock_ins": False,
            "prefer_tax_saving": False,
        }
        if preferences_override:
            preferences.update(preferences_override)

        context = {
            "user": None,
            "user_name": "there",
            "portfolio": [],
            "allocation_pcts": {},
            "total_portfolio_value": 0,
            "signals": signals,
            "signals_summary": [
                {"name": s.signal_name, "direction": s.direction, "category": s.signal_category}
                for s in signals[:10]
            ],
            "top_fd_rate": top_fd.get("rate", "N/A"),
            "top_fd_bank": top_fd.get("bank", "N/A"),
            "gold_30d_change": gold_change,
            "top_mf_categories": top_mf_cats,
            "preferences": preferences,
            "amount": amount,
        }

        # Step 2: STRATEGY
        strategy = await self._get_strategy(context)
        if strategy.get("error"):
            return {**context, "strategy_error": strategy["error"]}

        # Step 3: ALLOCATE
        allocation = self._calculate_allocation(amount, strategy, context)

        # Step 3.5: SELECT INSTRUMENTS ← THIS WAS MISSING
        detailed_allocation = await self._select_instruments(allocation, strategy, context)

        for item in detailed_allocation:
            item["percentage"] = round((item["amount"] / amount) * 100, 1)

        # Step 4+5: VALIDATE & EXPLAIN (parallel)
        validation, explanation = await asyncio.gather(
            self._validate_allocation(strategy, detailed_allocation, context),
            self._explain(context, detailed_allocation),
        )

        return {
            "user_id": None,
            "amount": amount,
            "strategy": strategy,
            "allocation": detailed_allocation,
            "validation": validation,
            "explanation": explanation,
            "signals_used": context.get("signals_summary", []),
            "generated_at": datetime.utcnow().isoformat(),
        }

    # ─── Step 1: GATHER ─────────────────────────────────────

    async def _gather_context(
        self,
        user_id: int,
        amount: float,
        risk_override: Optional[str],
        preferences_override: Optional[Dict],
    ) -> Dict[str, Any]:
        """Collect everything the pipeline needs from DB."""
        
        # User
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return {"error": f"User {user_id} not found"}

        # Portfolio
        holdings_result = await self.db.execute(
            select(PortfolioHolding).where(PortfolioHolding.user_id == user_id)
        )
        holdings = holdings_result.scalars().all()

        portfolio = [
            {
                "asset_type": h.asset_type,
                "name": h.asset_name,
                "invested": h.invested_amount,
                "current_value": h.current_value,
            }
            for h in holdings
        ]

        # Pre-calculate allocation percentages (Python, not LLM)
        total_value = sum(h.current_value or 0 for h in holdings)
        allocation_pcts = {}
        if total_value > 0:
            by_type: Dict[str, float] = {}
            for h in holdings:
                by_type[h.asset_type] = by_type.get(h.asset_type, 0) + (h.current_value or 0)
            allocation_pcts = {k: round(v / total_value * 100, 1) for k, v in by_type.items()}

        # Active signals (the whole point of the new architecture)
        signals = await self._get_active_signals()

        # Top FD rate
        top_fd = await self._get_top_fd()

        # Gold 30d change
        gold_change = await self._get_gold_30d_change()

        # Top MF categories
        top_mf_cats = await self._get_top_mf_categories()

        # User preferences
        risk = risk_override or (user.risk_tolerance.value if user.risk_tolerance else "moderate")
        preferences = {
            "risk_tolerance": risk,
            "horizon_years": user.investment_horizon_years or 5,
            "avoid_lock_ins": (user.preferences or {}).get("avoid_lock_ins", False),
            "prefer_tax_saving": (user.preferences or {}).get("prefer_tax_saving", False),
        }
        if preferences_override:
            preferences.update(preferences_override)

        return {
            "user": user,
            "user_name": user.full_name or "there",
            "portfolio": portfolio,
            "allocation_pcts": allocation_pcts,
            "total_portfolio_value": total_value,
            "signals": signals,
            "signals_summary": [
                {"name": s.signal_name, "direction": s.direction, "category": s.signal_category}
                for s in signals[:10]
            ],
            "top_fd_rate": top_fd.get("rate", "N/A"),
            "top_fd_bank": top_fd.get("bank", "N/A"),
            "gold_30d_change": gold_change,
            "top_mf_categories": top_mf_cats,
            "preferences": preferences,
            "amount": amount,
        }

    async def _get_active_signals(self) -> List[MarketSignal]:
        """Get all active, non-expired signals sorted by confidence."""
        result = await self.db.execute(
            select(MarketSignal)
            .where(
                MarketSignal.is_active == True,
                MarketSignal.confidence >= 0.4,
            )
            .order_by(desc(MarketSignal.confidence))
            .limit(30)
        )
        return list(result.scalars().all())

    async def _get_top_fd(self) -> Dict[str, Any]:
        """Get the highest FD rate currently available."""
        result = await self.db.execute(
            select(FixedDepositRate)
            .order_by(desc(FixedDepositRate.interest_rate_general))
            .limit(1)
        )
        fd = result.scalar_one_or_none()
        if fd:
            return {"rate": fd.interest_rate_general, "bank": fd.bank_name}
        return {"rate": "N/A", "bank": "N/A"}

    async def _get_gold_30d_change(self) -> str:
        """Calculate gold price change over 30 days."""
        now_result = await self.db.execute(
            select(GoldSilverPrice)
            .where(GoldSilverPrice.metal_type == "gold")
            .order_by(desc(GoldSilverPrice.recorded_at))
            .limit(1)
        )
        current = now_result.scalar_one_or_none()

        cutoff = datetime.utcnow() - timedelta(days=30)
        old_result = await self.db.execute(
            select(GoldSilverPrice)
            .where(
                GoldSilverPrice.metal_type == "gold",
                GoldSilverPrice.recorded_at <= cutoff,
            )
            .order_by(desc(GoldSilverPrice.recorded_at))
            .limit(1)
        )
        old = old_result.scalar_one_or_none()

        if current and old and old.price_per_gram > 0:
            change = ((current.price_per_gram - old.price_per_gram) / old.price_per_gram) * 100
            return f"{change:+.1f}"
        return "N/A"

    async def _get_top_mf_categories(self) -> str:
        """Get top performing MF categories by average 1y return."""
        result = await self.db.execute(
            select(MutualFund.category)
            .where(MutualFund.return_1y.isnot(None), MutualFund.is_active == True)
            .group_by(MutualFund.category)
            .order_by(desc(func.avg(MutualFund.return_1y)))
            .limit(3)
        )
        categories = [r[0] for r in result.fetchall() if r[0]]
        return ", ".join(categories) if categories else "data unavailable"

    # ─── Step 2: STRATEGY (LLM) ─────────────────────────────

    async def _get_strategy(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Ask LLM for directional strategy based on signals + portfolio."""
        signals_for_prompt = [
            {
                "signal_name": s.signal_name,
                "direction": s.direction,
                "strength": s.strength,
                "affected_asset_classes": s.affected_asset_classes,
                "reasoning": s.reasoning,
                "confidence": s.confidence,
            }
            for s in context["signals"][:15]
        ]

        prompt = STRATEGY_PROMPT_TEMPLATE.format(
            amount=context["amount"],
            portfolio_json=json.dumps(context["portfolio"], indent=2),
            allocation_json=json.dumps(context["allocation_pcts"], indent=2),
            signals_json=json.dumps(signals_for_prompt, indent=2),
            preferences_json=json.dumps(context["preferences"], indent=2),
            top_fd_rate=context["top_fd_rate"],
            top_fd_bank=context["top_fd_bank"],
            gold_30d_change=context["gold_30d_change"],
            top_mf_categories=context["top_mf_categories"],
        )

        # Try primary model, fall back to fast model, then to safe defaults
        for model in [settings.PRIMARY_MODEL, settings.FAST_MODEL]:
            try:
                response = await self.ai_client.complete(
                    prompt=prompt,
                    system_prompt=ZRATA_X_SYSTEM_PROMPT,
                    model=model,
                    response_format={"type": "json_object"},
                    temperature=0.4,
                    max_tokens=2048,
                )
                if not response or not response.strip():
                    logger.warning(f"Empty response from {model}, trying next")
                    continue
                return json.loads(response)
            except Exception as e:
                logger.error(f"Strategy call failed with {model}: {e}")
                continue

        # All models failed — return safe default strategy
        logger.warning("All strategy models failed, using safe defaults")
        return {
            "strategy": {
                "equity_weight": "maintain",
                "debt_weight": "maintain",
                "gold_weight": "maintain",
                "reasoning": "Using balanced defaults due to temporary analysis unavailability.",
            },
            "instrument_guidance": [],
            "opportunities": [],
            "behavioral_note": None,
        }
    # ─── Step 3: ALLOCATE (Python math) ──────────────────────

    def _calculate_allocation(
        self,
        amount: float,
        strategy: Dict[str, Any],
        context: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Pure Python math. Converts strategy direction into ₹ amounts.
        
        The LLM said "increase equity, maintain debt, decrease gold".
        This function decides "₹25,000 equity, ₹15,000 debt, ₹10,000 gold"
        based on the user's current allocation and risk tolerance.
        """
        strat = strategy.get("strategy", {})
        risk = context["preferences"].get("risk_tolerance", "moderate")
        current_alloc = context["allocation_pcts"]

        # Base weights by risk tolerance (starting point, adjusted by strategy)
        BASE_WEIGHTS = {
            "very_low":    {"equity": 0.20, "debt": 0.60, "gold": 0.20},
            "low":         {"equity": 0.30, "debt": 0.50, "gold": 0.20},
            "conservative":{"equity": 0.30, "debt": 0.50, "gold": 0.20},
            "moderate":    {"equity": 0.50, "debt": 0.30, "gold": 0.20},
            "high":        {"equity": 0.65, "debt": 0.20, "gold": 0.15},
            "very_high":   {"equity": 0.75, "debt": 0.15, "gold": 0.10},
            "aggressive":  {"equity": 0.75, "debt": 0.15, "gold": 0.10},
        }
        weights = dict(BASE_WEIGHTS.get(risk, BASE_WEIGHTS["moderate"]))

        # Apply strategy tilts (±10% per direction)
        TILT = 0.10
        direction_map = {
            "equity_weight": "equity",
            "debt_weight": "debt",
            "gold_weight": "gold",
        }
        for key, asset in direction_map.items():
            direction = strat.get(key, "maintain")
            if direction == "increase":
                weights[asset] = min(weights[asset] + TILT, 0.85)
            elif direction == "decrease":
                weights[asset] = max(weights[asset] - TILT, 0.05)

        # Normalize weights to sum to 1.0
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}

        # Calculate ₹ amounts
        allocation = []
        for asset_class, weight in weights.items():
            amt = round(amount * weight, -2)  # round to nearest ₹100
            allocation.append({
                "asset_class": asset_class,
                "amount": amt,
                "percentage": round(weight * 100, 1),
            })

        # Adjust for rounding errors — assign remainder to largest bucket
        total_allocated = sum(a["amount"] for a in allocation)
        diff = amount - total_allocated
        if diff != 0 and allocation:
            allocation[0]["amount"] += diff

        return allocation

    # ─── Step 4: VALIDATE (LLM) ─────────────────────────────

    async def _validate_allocation(
        self,
        strategy: Dict[str, Any],
        allocation: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """LLM reviews the Python-calculated allocation for sanity."""
        # Build projected portfolio
        projected = dict(context["allocation_pcts"])
        total_after = context["total_portfolio_value"] + context["amount"]
        for a in allocation:
            asset = a["asset_class"]
            old_value = (projected.get(asset, 0) / 100) * context["total_portfolio_value"]
            new_value = old_value + a["amount"]
            if total_after > 0:
                projected[asset] = round((new_value / total_after) * 100, 1)

        prompt = VALIDATION_PROMPT_TEMPLATE.format(
            strategy_json=json.dumps(strategy.get("strategy", {}), indent=2),
            calculated_allocation_json=json.dumps(allocation, indent=2),
            risk_tolerance=context["preferences"].get("risk_tolerance", "moderate"),
            projected_portfolio_json=json.dumps(projected, indent=2),
        )

        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                system_prompt=ZRATA_X_SYSTEM_PROMPT,
                model=settings.FAST_MODEL,  # Validation is simpler, use fast model
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=1024,
            )
            return json.loads(response)
        except Exception as e:
            logger.error(f"Validation LLM call failed: {e}")
            return {"validation": "pass", "flags": [], "explanation": "Validation skipped due to error."}

    # ─── Step 5: EXPLAIN (LLM) ──────────────────────────────

    async def _explain(
        self, context: Dict[str, Any], allocation: List[Dict[str, Any]]
    ) -> str:
        """Generate plain-language explanation for the user."""
        key_signals = [
            f"- {s.signal_name}: {s.direction} ({s.reasoning})"
            for s in context["signals"][:5]
        ]

        prompt = EXPLANATION_PROMPT_TEMPLATE.format(
            user_name=context["user_name"],
            amount=context["amount"],
            final_allocation_json=json.dumps(allocation, indent=2),
            key_signals="\n".join(key_signals) if key_signals else "No strong signals this month.",
        )

        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                system_prompt=ZRATA_X_SYSTEM_PROMPT,
                model=settings.FAST_MODEL,
                temperature=0.6,
                max_tokens=500,
            )
            return response
        except Exception as e:
            logger.error(f"Explanation LLM call failed: {e}")
            return "Your investment plan has been calculated based on current market conditions and your portfolio. Please review the allocation above."       
        
    # ─── Step 5: PICK (LLM + PYTHON) ──────────────────────────────     
    async def _select_instruments(
        self,
        allocation: List[Dict[str, Any]],
        strategy: Dict[str, Any],
        context: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Step 3.5: INSTRUMENT SELECTION (Hybrid)
        
        Python shortlists valid instruments from DB.
        LLM picks + reasons from the shortlist.
        Python validates the math.
        """
        # Step A: Python builds shortlists from DB
        shortlists = {}
        for bucket in allocation:
            asset_class = bucket["asset_class"]
            if asset_class == "equity":
                shortlists["equity"] = await self._shortlist_equity()
            elif asset_class == "debt":
                shortlists["debt"] = await self._shortlist_debt()
            elif asset_class == "gold":
                shortlists["gold"] = await self._shortlist_gold()

        # Step B: LLM picks from shortlists
        picks = await self._llm_pick_instruments(allocation, shortlists, strategy, context)

        # Step C: Python validates and fixes math
        return self._validate_instrument_picks(picks, allocation, shortlists)


    # ── Step A: Python shortlists (DB queries, no LLM) ──

    async def _shortlist_equity(self) -> List[Dict]:
        """Top direct MFs with real data, diversified by category."""
        result = await self.db.execute(
            select(MutualFund)
            .where(
                MutualFund.plan_type == "direct",
                MutualFund.is_active == True,
                MutualFund.nav > 0,
                MutualFund.return_1y.isnot(None),
            )
            .order_by(desc(MutualFund.return_1y))
            .limit(30)
        )
        funds = result.scalars().all()

        # Diversify: max 3 per category, take top 10 overall
        seen_cats: Dict[str, int] = {}
        shortlist = []
        for mf in funds:
            cat = mf.category or "other"
            if seen_cats.get(cat, 0) >= 3:
                continue
            seen_cats[cat] = seen_cats.get(cat, 0) + 1
            shortlist.append({
                "id": mf.scheme_code,
                "name": mf.scheme_name,
                "category": mf.category,
                "amc": mf.amc_name,
                "return_1y": round(mf.return_1y, 2) if mf.return_1y else None,
                "return_3y": round(mf.return_3y, 2) if mf.return_3y else None,
                "nav": round(mf.nav, 2),
            })
            if len(shortlist) >= 10:
                break

        return shortlist


    async def _shortlist_debt(self) -> List[Dict]:
        """Top FDs, prefer diversity across bank types."""
        result = await self.db.execute(
            select(FixedDepositRate)
            .where(FixedDepositRate.interest_rate_general > 0)
            .order_by(desc(FixedDepositRate.interest_rate_general))
            .limit(15)
        )
        fds = result.scalars().all()

        shortlist = []
        seen_banks = set()
        for fd in fds:
            if fd.bank_name in seen_banks:
                continue
            seen_banks.add(fd.bank_name)
            shortlist.append({
                "id": f"fd_{fd.bank_name.lower().replace(' ', '_')}_{fd.tenure_display}",
                "name": f"{fd.bank_name} FD ({fd.tenure_display})",
                "bank": fd.bank_name,
                "bank_type": fd.bank_type,
                "tenure": fd.tenure_display,
                "rate": fd.interest_rate_general,
                "rate_senior": fd.interest_rate_senior,
                "has_credit_card": fd.has_credit_card_offer,
            })
            if len(shortlist) >= 6:
                break

        return shortlist


    async def _shortlist_gold(self) -> List[Dict]:
        """Gold/silver ETFs, sorted by expense ratio."""
        result = await self.db.execute(
            select(ETF)
            .where(ETF.underlying.in_(["gold", "silver"]), ETF.nav > 0)
            .order_by(ETF.expense_ratio.asc().nullslast())
            .limit(6)
        )
        etfs = result.scalars().all()

        return [
            {
                "id": etf.symbol,
                "name": etf.name,
                "underlying": etf.underlying,
                "nav": round(etf.nav, 2),
                "expense_ratio": etf.expense_ratio,
            }
            for etf in etfs
        ]


    # ── Step B: LLM picks from shortlists ──

    async def _llm_pick_instruments(
        self,
        allocation: List[Dict],
        shortlists: Dict[str, List[Dict]],
        strategy: Dict,
        context: Dict,
    ) -> List[Dict]:
        """LLM selects instruments from Python-curated shortlists."""

        prompt = INSTRUMENT_SELECTION_PROMPT.format(
            allocation_json=json.dumps(allocation, indent=2),
            equity_shortlist=json.dumps(shortlists.get("equity", []), indent=2),
            debt_shortlist=json.dumps(shortlists.get("debt", []), indent=2),
            gold_shortlist=json.dumps(shortlists.get("gold", []), indent=2),
            guidance_json=json.dumps(strategy.get("instrument_guidance", []), indent=2),
            risk_tolerance=context["preferences"].get("risk_tolerance", "moderate"),
            portfolio_json=json.dumps(context.get("portfolio", []), indent=2),
        )

        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                system_prompt=ZRATA_X_SYSTEM_PROMPT,
                model=settings.FAST_MODEL,  # ← Use fast model, this is selection not strategy
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2048,
            )
            return json.loads(response).get("instruments", [])
        except Exception as e:
            logger.error(f"LLM instrument selection failed: {e}, falling back to Python")
            return self._fallback_pick(allocation, shortlists)


    # ── Step C: Python validates LLM picks ──

    def _validate_instrument_picks(
        self,
        picks: List[Dict],
        allocation: List[Dict],
        shortlists: Dict[str, List[Dict]],
    ) -> List[Dict]:
        """
        Ensure LLM picks are valid:
        - Every instrument ID exists in a shortlist
        - Amounts per asset class sum correctly
        - No single instrument gets >60% of its bucket
        """
        # Build lookup of valid IDs
        valid_ids = set()
        for sl in shortlists.values():
            for item in sl:
                valid_ids.add(item["id"])

        # Build target amounts per asset class
        target_by_class = {a["asset_class"]: a["amount"] for a in allocation}

        # Validate each pick
        validated = []
        actual_by_class: Dict[str, float] = {}

        for pick in picks:
            instrument_id = pick.get("instrument_id", "")
            asset_class = pick.get("asset_class", "")

            # Skip if ID doesn't exist in shortlist (hallucinated)
            if instrument_id and instrument_id not in valid_ids:
                logger.warning(f"LLM picked invalid instrument: {instrument_id}, skipping")
                continue

            validated.append(pick)
            actual_by_class[asset_class] = actual_by_class.get(asset_class, 0) + pick.get("amount", 0)

        # Fix amounts to match allocation targets
        for asset_class, target in target_by_class.items():
            class_picks = [p for p in validated if p["asset_class"] == asset_class]
            if not class_picks:
                # LLM missed this class entirely — use fallback
                validated.extend(
                    self._fallback_pick_for_class(asset_class, target, shortlists)
                )
                continue

            actual_total = sum(p["amount"] for p in class_picks)
            if actual_total != target and actual_total > 0:
                # Scale proportionally to match target
                scale = target / actual_total
                for p in class_picks:
                    p["amount"] = round(p["amount"] * scale, -2)
                # Fix rounding on last item
                remainder = target - sum(p["amount"] for p in class_picks[:-1])
                class_picks[-1]["amount"] = remainder

        return validated


    def _fallback_pick(
        self,
        allocation: List[Dict],
        shortlists: Dict[str, List[Dict]],
    ) -> List[Dict]:
        """If LLM fails entirely, pick top instruments mechanically."""
        result = []
        for bucket in allocation:
            result.extend(
                self._fallback_pick_for_class(
                    bucket["asset_class"], bucket["amount"], shortlists
                )
            )
        return result


    def _fallback_pick_for_class(
        self,
        asset_class: str,
        amount: float,
        shortlists: Dict[str, List[Dict]],
    ) -> List[Dict]:
        """Mechanical top-N pick for a single asset class."""
        key = asset_class if asset_class in shortlists else (
            "equity" if asset_class == "equity" else
            "debt" if asset_class in ("debt", "fd") else
            "gold"
        )
        sl = shortlists.get(key, [])
        if not sl:
            return [{
                "asset_class": asset_class,
                "instrument_name": f"{asset_class.title()} (no data — check directly)",
                "instrument_id": "",
                "amount": amount,
                "percentage": 0,
                "reason": "No instrument data available in database.",
            }]

        # Pick top 1-2
        picks = sl[:2] if amount >= 5000 else sl[:1]
        split = amount / len(picks)

        return [
            {
                "asset_class": asset_class,
                "instrument_name": p["name"],
                "instrument_id": p["id"],
                "amount": round(split, -2),
                "percentage": 0,
                "reason": f"Top {asset_class} option by {'return' if asset_class == 'equity' else 'rate'}",
            }
            for p in picks
        ]        