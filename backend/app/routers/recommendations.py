"""
AI-powered investment recommendations API.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.asset_data import (ETF, FixedDepositRate, MacroIndicator,
                                   MutualFund)
from app.models.user import (InvestmentPlan, PortfolioHolding, RiskTolerance,
                             User)
from app.services.ai_engine.openrouter_client import OpenRouterClient
from app.services.ai_engine.recommendation_pipeline import \
    RecommendationPipeline
from app.services.memory.supermemory_service import SupermemoryService
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/recommend", tags=["Recommendations"])


class InvestmentInput(BaseModel):
    amount: float = Field(..., gt=0, le=10000000)
    risk_override: Optional[str] = None
    avoid_lock_ins: bool = False
    prefer_tax_saving: bool = False
    include_fds: bool = True
    include_gold: bool = True


class SuggestionItem(BaseModel):
    asset_type: str
    instrument_name: str
    instrument_id: str
    amount: float
    percentage: float
    reason: str
    highlight: Optional[str] = None
    current_rate: Optional[float] = None


class RecommendationResponse(BaseModel):
    id: int
    suggestions: List[SuggestionItem]
    summary: str
    risk_note: str
    tax_note: Optional[str]
    market_context: dict
    valid_until: datetime


class GuestInvestmentInput(BaseModel):
    """Simplified input for guest users without portfolio context."""
    amount: float = Field(..., gt=0, le=10000000)
    risk_profile: Optional[str] = "moderate"  # conservative, moderate, aggressive
    avoid_lock_ins: bool = False
    prefer_tax_saving: bool = False
    include_fds: bool = True
    include_gold: bool = True


class GuestRecommendationResponse(BaseModel):
    """Simplified response for guests - no persistence."""
    suggestions: List[SuggestionItem]
    summary: str
    risk_note: str
    tax_note: Optional[str] = None
    market_context: dict
    disclaimer: str
    generated_at: datetime


class GuestPipelineInput(BaseModel):
    """Input for guest pipeline — no user_id needed."""
    amount: float = Field(..., gt=0, le=10000000)
    risk_override: Optional[str] = None
    preferences_override: Optional[dict] = None


@router.post("/invest", response_model=RecommendationResponse)
async def get_investment_recommendation(
    user_id: int,
    request: InvestmentInput,
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use the pipeline correctly
    pipeline = RecommendationPipeline(db)  # ← was missing db
    result = await pipeline.generate(       # ← was calling .run()
        user_id=user_id,
        amount=request.amount,
        risk_override=request.risk_override,
    )

    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    # Store the plan
    risk = request.risk_override or user.risk_tolerance.value
    market_data = await _get_market_snapshot(db)

    plan = InvestmentPlan(
        user_id=user_id,
        investment_amount=request.amount,
        risk_level_used=risk,
        recommendations=result.get("allocation", []),
        market_analysis=market_data,
        reasoning=result.get("explanation", ""),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    # Map pipeline output → SuggestionItem format
    suggestions = _allocation_to_suggestions(result.get("allocation", []))

    return RecommendationResponse(
        id=plan.id,
        suggestions=suggestions,
        summary=result.get("explanation", ""),
        risk_note=result.get("validation", {}).get("risk_note", ""),
        tax_note=result.get("validation", {}).get("tax_note"),
        market_context=market_data,
        valid_until=plan.expires_at,
    )

async def _get_available_options(
    db: AsyncSession,
    request: InvestmentInput
) -> dict:
    """Get available investment options dynamically. Only includes options with real data."""
    options = {}
    data_gaps = []  # Track what data we're missing
    
    # Top mutual funds by category — ONLY with valid NAV and returns
    mf_result = await db.execute(
        select(MutualFund)
        .where(
            MutualFund.plan_type == "direct",
            MutualFund.nav > 0,  # Must have real NAV
            MutualFund.is_active == True,
        )
        .order_by(MutualFund.return_1y.desc().nullslast())
        .limit(50)
    )
    mutual_funds = mf_result.scalars().all()
    
    # Further filter: prefer funds WITH return data
    funds_with_returns = [mf for mf in mutual_funds if mf.return_1y is not None]
    funds_without_returns = [mf for mf in mutual_funds if mf.return_1y is None]
    
    # Use funds with returns first, backfill with NAV-only funds if needed
    selected_funds = funds_with_returns[:30] + funds_without_returns[:10]
    
    if not funds_with_returns:
        data_gaps.append("mutual_fund_returns")
    if not selected_funds:
        data_gaps.append("mutual_funds")
    
    options["mutual_funds"] = [
        {
            "scheme_code": mf.scheme_code,
            "name": mf.scheme_name,
            "category": mf.category,
            "amc": mf.amc_name,
            "nav": mf.nav,
            "nav_date": mf.nav_date.isoformat() if mf.nav_date else None,
            "return_1y": mf.return_1y,
            "return_3y": mf.return_3y,
            "return_5y": mf.return_5y,
        }
        for mf in selected_funds
    ]
    
    # Best FD rates if included
    if request.include_fds:
        fd_result = await db.execute(
            select(FixedDepositRate)
            .where(FixedDepositRate.interest_rate_general > 0)
            .order_by(FixedDepositRate.interest_rate_general.desc())
            .limit(20)
        )
        fds = fd_result.scalars().all()
        if not fds:
            data_gaps.append("fixed_deposits")
        options["fixed_deposits"] = [
            {
                "bank": fd.bank_name,
                "bank_type": fd.bank_type,
                "tenure": fd.tenure_display,
                "rate_general": fd.interest_rate_general,
                "rate_senior": fd.interest_rate_senior,
                "has_credit_card": fd.has_credit_card_offer,
            }
            for fd in fds
        ]
    
    # Gold/Silver options if included
    if request.include_gold:
        etf_result = await db.execute(
            select(ETF).where(
                ETF.underlying.in_(["gold", "silver"]),
                ETF.nav > 0,  # Must have real price
            )
        )
        etfs = etf_result.scalars().all()
        if not etfs:
            data_gaps.append("gold_silver_etfs")
        options["gold_silver_etfs"] = [
            {
                "symbol": etf.symbol,
                "name": etf.name,
                "underlying": etf.underlying,
                "nav": etf.nav,
                "expense_ratio": etf.expense_ratio,
            }
            for etf in etfs
        ]
    
    # Attach data quality info so LLM knows what it's working with
    options["_data_quality"] = {
        "mutual_funds_with_returns": len(funds_with_returns),
        "mutual_funds_nav_only": len(funds_without_returns),
        "data_gaps": data_gaps,
    }
    
    return options

async def _get_market_snapshot(db: AsyncSession) -> dict:
    """Get current market conditions."""
    indicators_result = await db.execute(
        select(MacroIndicator).order_by(MacroIndicator.recorded_at.desc())
    )
    indicators = indicators_result.scalars().all()
    
    snapshot = {}
    for ind in indicators:
        if ind.indicator_name not in snapshot:
            snapshot[ind.indicator_name] = {
                "value": ind.value,
                "previous": ind.previous_value,
                "change": ind.change_percent,
                "unit": ind.unit
            }
    
    return snapshot


@router.post("/pipeline")
async def get_pipeline_recommendation(
    user_id: int,
    request: InvestmentInput,
    db: AsyncSession = Depends(get_db)
):
    """Multi-step pipeline recommendation."""
    from app.services.ai_engine.recommendation_pipeline import \
        RecommendationPipeline
    
    pipeline = RecommendationPipeline(db)
    result = await pipeline.generate(
        user_id=user_id,
        amount=request.amount,
        risk_override=request.risk_override,
    )
    return result

@router.post("/backtest")
async def backtest_strategy(
    user_id: int,
    strategy: dict,
    years: int = 5,
    db: AsyncSession = Depends(get_db)
):
    """
    Backtest a strategy against historical data.
    Shows "what if I had done this X years ago".
    """
    ai_client = OpenRouterClient()
    
    prompt = f"""
    Simulate the performance of this investment strategy over the past {years} years
    using Indian market data:
    
    Strategy:
    {strategy}
    
    Consider:
    - Actual historical returns of Indian mutual funds, gold, FDs
    - Inflation impact
    - Tax implications
    - Market volatility periods
    
    Return a JSON with:
    - projected_value: estimated current value
    - cagr: compound annual growth rate
    - max_drawdown: worst peak-to-trough decline
    - volatility: standard deviation of returns
    - comparison: how this compared to simple FD or Nifty 50
    - yearly_breakdown: year by year performance
    """
    
    response = await ai_client.complete(
        prompt=prompt,
        response_format={"type": "json_object"}
    )
    
    import json
    return json.loads(response)

@router.post("/invest/guest", response_model=GuestRecommendationResponse)
async def get_guest_recommendation(
    request: GuestInvestmentInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Get investment recommendation for guest users.
    No user context or portfolio - purely market-based suggestions.
    """
    # Get available options
    available_options = await _get_available_options_guest(db, request)
    
    # Get market data
    market_data = await _get_market_snapshot(db)
    
    # Build basic preferences
    preferences = {
        "risk_tolerance": request.risk_profile,
        "horizon_years": 5,  # Default assumption for guests
        "avoid_lock_ins": request.avoid_lock_ins,
        "prefer_tax_saving": request.prefer_tax_saving,
    }
    
    # Get AI recommendation (no portfolio context for guests)
    ai_client = OpenRouterClient()
    recommendation = await ai_client.generate_investment_suggestion(
        investment_amount=request.amount,
        current_portfolio=[],  # Empty for guests
        market_data=market_data,
        user_preferences=preferences,
        available_options=available_options
    )
    
    # Convert AI response to structured format
    suggestions = []
    for s in recommendation.get("suggestions", []):
        suggestions.append(SuggestionItem(
            asset_type=s.get("asset_type", "unknown"),
            instrument_name=s.get("instrument", ""),
            instrument_id=s.get("instrument_id", ""),
            amount=s.get("amount", 0),
            percentage=s.get("percentage", 0),
            reason=s.get("reason", ""),
            highlight=s.get("highlight"),
            current_rate=s.get("current_rate")
        ))
    
    return GuestRecommendationResponse(
        suggestions=suggestions,
        summary=recommendation.get("summary", ""),
        risk_note=recommendation.get("risk_note", ""),
        tax_note=recommendation.get("tax_note"),
        market_context=market_data,
        disclaimer="This is educational information based on current market data. Not personalized investment advice. Sign in to get portfolio-aware recommendations.",
        generated_at=datetime.utcnow()
    )


async def _get_available_options_guest(
    db: AsyncSession,
    request: GuestInvestmentInput
) -> dict:
    """Get available investment options for guest users."""
    options = {}
    
    # Top mutual funds by category
    mf_result = await db.execute(
        select(MutualFund)
        .where(MutualFund.plan_type == "direct")
        .order_by(MutualFund.return_1y.desc().nullslast())
        .limit(30)
    )
    mutual_funds = mf_result.scalars().all()
    options["mutual_funds"] = [
        {
            "scheme_code": mf.scheme_code,
            "name": mf.scheme_name,
            "category": mf.category,
            "return_1y": mf.return_1y,
            "nav": mf.nav
        }
        for mf in mutual_funds
    ]
    
    # Best FD rates if included
    if request.include_fds:
        fd_result = await db.execute(
            select(FixedDepositRate)
            .order_by(FixedDepositRate.interest_rate_general.desc())
            .limit(15)
        )
        fds = fd_result.scalars().all()
        options["fixed_deposits"] = [
            {
                "bank": fd.bank_name,
                "bank_type": fd.bank_type,
                "tenure": fd.tenure_display,
                "rate_general": fd.interest_rate_general,
                "rate_senior": fd.interest_rate_senior,
            }
            for fd in fds
        ]
    
    # Gold/Silver options if included
    if request.include_gold:
        etf_result = await db.execute(
            select(ETF).where(ETF.underlying.in_(["gold", "silver"]))
        )
        etfs = etf_result.scalars().all()
        options["gold_silver_etfs"] = [
            {
                "symbol": etf.symbol,
                "name": etf.name,
                "underlying": etf.underlying,
                "nav": etf.nav,
                "expense_ratio": etf.expense_ratio
            }
            for etf in etfs
        ]
    
    return options 

@router.post("/pipeline/guest")
async def get_guest_pipeline_recommendation(
    request: GuestPipelineInput,
    db: AsyncSession = Depends(get_db),
):
    """
    Pipeline recommendation for guests.
    No portfolio context — uses market signals + default moderate profile.
    """
    pipeline = RecommendationPipeline(db)
    result = await pipeline.generate_guest(
        amount=request.amount,
        risk_override=request.risk_override,
        preferences_override=request.preferences_override,
    )

    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    # Add disclaimer for guests
    result["disclaimer"] = (
        "This is educational information based on current market data. "
        "Not personalized investment advice. "
        "Sign in to get portfolio-aware recommendations."
    )
    return result


# ── Helper: convert allocation list → SuggestionItem list ──

def _allocation_to_suggestions(allocation: list) -> List[SuggestionItem]:
    suggestions = []
    for a in allocation:
        suggestions.append(SuggestionItem(
            asset_type=a.get("asset_class", "unknown"),
            instrument_name=a.get("instrument", a.get("asset_class", "")),
            instrument_id=a.get("instrument_id", ""),
            amount=a.get("amount", 0),
            percentage=a.get("percentage", 0),
            reason=a.get("reason", ""),
            highlight=a.get("highlight"),
            current_rate=a.get("current_rate"),
        ))
    return suggestions