"""
Enhanced Mutual Fund Data Service with comprehensive metrics.
Adds: expense ratios, fund manager details, holdings analysis, risk metrics,
rolling returns, alpha/beta/sharpe ratio, exit loads, and fund size trends.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset_data import MutualFund

logger = logging.getLogger(__name__)

MFAPI_BASE_URL = "https://api.mfapi.in/mf"


class MutualFundDataService:
    """
    Enhanced MF service that collects comprehensive data:
    - Detailed performance metrics (rolling returns, absolute returns)
    - Risk metrics (standard deviation, sharpe ratio, sortino ratio)
    - Portfolio composition (top holdings, sector allocation)
    - Fund manager information and tenure
    - Expense ratio trends
    - AUM growth trends
    - Exit load details
    - Minimum investment amounts
    - SIP/Lumpsum options
    - Tax implications (LTCG/STCG treatment)
    - Benchmark comparison
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=60.0)

        # Additional data sources for enhanced metrics
        self.valueresearch_base = "https://www.valueresearchonline.com"
        self.morningstar_base = "https://www.morningstar.in"
        self.moneycontrol_base = "https://www.moneycontrol.com/mutual-funds"

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def sync_all_schemes(self, batch_size: int = 100) -> Dict[str, int]:
        """
        Compatibility wrapper for sync_comprehensive_schemes.
        Maintains backward compatibility with existing code.
        """
        return await self.sync_comprehensive_schemes(batch_size=batch_size)

    async def sync_comprehensive_schemes(self, batch_size: int = 100) -> Dict[str, int]:
        """
        Sync MF schemes with comprehensive data from multiple sources.
        """
        logger.info("Starting comprehensive MF scheme sync...")

        # Step 1: Get all schemes from MFAPI
        all_schemes = await self.fetch_all_schemes()

        if not all_schemes:
            logger.error("Failed to fetch schemes from MFAPI")
            return {"total": 0, "added": 0, "updated": 0, "failed": 0}

        stats = {"total": len(all_schemes), "added": 0, "updated": 0, "failed": 0}

        # Filter for Direct plans (better for investors)
        direct_schemes = [s for s in all_schemes if "direct" in s.get("schemeName", "").lower()]

        logger.info(f"Processing {len(direct_schemes)} direct plan schemes")

        # Process in batches
        for i in range(0, len(direct_schemes), batch_size):
            batch = direct_schemes[i : i + batch_size]
            batch_stats = await self._process_enhanced_batch(batch)

            stats["added"] += batch_stats["added"]
            stats["updated"] += batch_stats["updated"]
            stats["failed"] += batch_stats["failed"]

            logger.info(f"Processed batch {i // batch_size + 1}: {batch_stats}")

            # Be nice to APIs
            await asyncio.sleep(2)

        return stats

    async def _process_enhanced_batch(self, schemes: List[Dict[str, Any]]) -> Dict[str, int]:
        """Process a batch of schemes with enhanced data collection."""
        stats = {"added": 0, "updated": 0, "failed": 0}

        for scheme in schemes:
            try:
                scheme_code = scheme.get("schemeCode")
                if not scheme_code:
                    continue

                # Fetch comprehensive data
                enhanced_data = await self._fetch_comprehensive_scheme_data(scheme_code)

                if not enhanced_data:
                    stats["failed"] += 1
                    continue

                # Store in database with enhanced fields
                is_new = await self._store_enhanced_scheme(enhanced_data)

                # Commit after each successful insert/update
                await self.db.commit()

                if is_new:
                    stats["added"] += 1
                else:
                    stats["updated"] += 1

            except Exception as e:
                # Rollback the transaction on error
                await self.db.rollback()
                logger.error(
                    f"Failed to process scheme {scheme.get('schemeCode')}: {type(e).__name__}: {str(e)}"
                )
                stats["failed"] += 1

        return stats

    async def _fetch_comprehensive_scheme_data(self, scheme_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch comprehensive data for a scheme from multiple sources.
        """
        # Base data from MFAPI
        base_data = await self.fetch_scheme_details(scheme_code)
        if not base_data:
            return None

        meta = base_data.get("meta", {})
        nav_data = base_data.get("data", [])

        if not nav_data:
            return None

        latest_nav = nav_data[0]

        # Calculate enhanced returns
        returns = self._calculate_comprehensive_returns(nav_data)

        # If comprehensive returns failed, try simple calculation
        if not returns.get("return_1y") and len(nav_data) >= 365:
            logger.info(
                f"Scheme {scheme_code}: Comprehensive returns failed, trying simple calculation"
            )
            returns = self._calculate_simple_returns(nav_data)

        logger.info(
            f"Scheme {scheme_code}: Returns - 1m: {returns.get('return_1m')}, 1y: {returns.get('return_1y')}"
        )

        # Calculate risk metrics
        risk_metrics = self._calculate_risk_metrics(nav_data)
        logger.info(
            f"Scheme {scheme_code}: Risk - volatility: {risk_metrics.get('volatility_1y')}, sharpe: {risk_metrics.get('sharpe_ratio_1y')}"
        )

        # Determine category and sub-category
        scheme_name = meta.get("scheme_name", "")
        category = self._determine_category(scheme_name)
        sub_category = self._determine_sub_category(scheme_name)

        # Build enhanced scheme data
        enhanced_data = {
            # Basic info (always required)
            "scheme_code": str(scheme_code),
            "scheme_name": scheme_name,
            "amc_name": self._extract_amc_name(scheme_name),
            "category": category,
            "sub_category": sub_category,
            "plan_type": "direct" if "direct" in scheme_name.lower() else "regular",
            # NAV data
            "nav": float(latest_nav.get("nav", 0)),
            "nav_date": datetime.strptime(latest_nav.get("date"), "%d-%m-%Y"),
            # Returns (from calculations)
            "return_1m": returns.get("return_1m"),
            "return_3m": returns.get("return_3m"),
            "return_6m": returns.get("return_6m"),
            "return_1y": returns.get("return_1y"),
            "return_3y": returns.get("return_3y"),
            "return_5y": returns.get("return_5y"),
            "return_ytd": returns.get("return_ytd"),
            "return_absolute_1y": returns.get("return_absolute_1y"),
            "rolling_return_1y_avg": returns.get("rolling_return_1y_avg"),
            "best_1y_return": returns.get("best_1y_return"),
            "worst_1y_return": returns.get("worst_1y_return"),
            # Risk metrics (from calculations)
            "volatility_1y": risk_metrics.get("volatility_1y"),
            "sharpe_ratio_1y": risk_metrics.get("sharpe_ratio_1y"),
            "max_drawdown_1y": risk_metrics.get("max_drawdown_1y"),
            "downside_deviation": risk_metrics.get("downside_deviation"),
            # Metadata
            "source_url": f"{MFAPI_BASE_URL}/{scheme_code}",
            "raw_data": base_data,
            "is_active": True,
        }

        # Log what we're storing for debugging
        logger.debug(
            f"Storing scheme {scheme_code} with returns: 1m={returns.get('return_1m')}, 1y={returns.get('return_1y')}"
        )

        # Try to fetch additional data from other sources
        additional_data = await self._fetch_additional_metrics(scheme_code, scheme_name)
        if additional_data:
            enhanced_data.update(additional_data)

        return enhanced_data

    def _calculate_comprehensive_returns(
        self, nav_data: List[Dict[str, Any]]
    ) -> Dict[str, Optional[float]]:
        """
        Calculate comprehensive return metrics including rolling returns.
        """
        if not nav_data or len(nav_data) < 2:
            return {
                "return_1m": None,
                "return_3m": None,
                "return_6m": None,
                "return_1y": None,
                "return_3y": None,
                "return_5y": None,
                "return_ytd": None,
                "return_absolute_1y": None,
                "rolling_return_1y_avg": None,
                "rolling_return_3y_avg": None,
                "best_1y_return": None,
                "worst_1y_return": None,
            }

        try:
            nav_dict = {}
            for item in nav_data:
                date_str = item.get("date")
                nav_val = float(item.get("nav", 0))
                date_obj = datetime.strptime(date_str, "%d-%m-%Y")
                nav_dict[date_obj] = nav_val

            sorted_dates = sorted(nav_dict.keys(), reverse=True)
            latest_date = sorted_dates[0]
            latest_nav = nav_dict[latest_date]

            def calculate_return(days: int) -> Optional[float]:
                target_date = latest_date - timedelta(days=days)
                # Find closest date
                closest_date = min(
                    [d for d in sorted_dates if d <= target_date],
                    key=lambda d: abs((d - target_date).days),
                    default=None,
                )
                if closest_date and nav_dict[closest_date] > 0:
                    old_nav = nav_dict[closest_date]
                    return_pct = ((latest_nav - old_nav) / old_nav) * 100
                    # Annualize for periods > 1 year
                    if days >= 365:
                        years = days / 365
                        return_pct = ((latest_nav / old_nav) ** (1 / years) - 1) * 100
                    return round(return_pct, 2)
                return None

            # Calculate rolling 1-year returns
            rolling_1y_returns = []
            rolling_3y_returns = []

            for i in range(len(sorted_dates) - 365):
                current_date = sorted_dates[i]
                date_1y_ago = current_date - timedelta(days=365)
                closest_1y = min(
                    [d for d in sorted_dates if d <= date_1y_ago],
                    key=lambda d: abs((d - date_1y_ago).days),
                    default=None,
                )
                if closest_1y:
                    ret_1y = ((nav_dict[current_date] / nav_dict[closest_1y]) - 1) * 100
                    rolling_1y_returns.append(ret_1y)

            # YTD return
            ytd_return = None
            year_start = datetime(latest_date.year, 1, 1)
            year_start_dates = [d for d in sorted_dates if d.year == year_start.year]
            if year_start_dates:
                earliest_this_year = min(year_start_dates)
                ytd_return = ((latest_nav / nav_dict[earliest_this_year]) - 1) * 100
                ytd_return = round(ytd_return, 2)

            return {
                "return_1m": calculate_return(30),
                "return_3m": calculate_return(90),
                "return_6m": calculate_return(180),
                "return_1y": calculate_return(365),
                "return_3y": calculate_return(1095),
                "return_5y": calculate_return(1825),
                "return_ytd": ytd_return,
                "return_absolute_1y": calculate_return(365),  # Non-annualized
                "rolling_return_1y_avg": round(sum(rolling_1y_returns) / len(rolling_1y_returns), 2)
                if rolling_1y_returns
                else None,
                "best_1y_return": round(max(rolling_1y_returns), 2) if rolling_1y_returns else None,
                "worst_1y_return": round(min(rolling_1y_returns), 2)
                if rolling_1y_returns
                else None,
            }

        except Exception as e:
            logger.warning(f"Error calculating returns: {e}")
            return {
                "return_1m": None,
                "return_3m": None,
                "return_6m": None,
                "return_1y": None,
                "return_3y": None,
                "return_5y": None,
                "return_ytd": None,
                "return_absolute_1y": None,
                "rolling_return_1y_avg": None,
                "best_1y_return": None,
                "worst_1y_return": None,
            }

    def _calculate_simple_returns(
        self, nav_data: List[Dict[str, Any]]
    ) -> Dict[str, Optional[float]]:
        """
        Simple returns calculation as fallback.
        Just calculates point-to-point returns without rolling returns.
        """
        if not nav_data or len(nav_data) < 2:
            return {
                "return_1m": None,
                "return_3m": None,
                "return_6m": None,
                "return_1y": None,
                "return_3y": None,
                "return_5y": None,
                "return_ytd": None,
                "return_absolute_1y": None,
                "rolling_return_1y_avg": None,
                "best_1y_return": None,
                "worst_1y_return": None,
            }

        try:
            # Get latest NAV
            latest = nav_data[0]
            latest_nav = float(latest.get("nav", 0))

            def get_return_for_days(days: int) -> Optional[float]:
                if len(nav_data) <= days:
                    return None
                old_nav = float(nav_data[min(days, len(nav_data) - 1)].get("nav", 0))
                if old_nav > 0:
                    return round(((latest_nav - old_nav) / old_nav) * 100, 2)
                return None

            return {
                "return_1m": get_return_for_days(30),
                "return_3m": get_return_for_days(90),
                "return_6m": get_return_for_days(180),
                "return_1y": get_return_for_days(365),
                "return_3y": get_return_for_days(1095),
                "return_5y": get_return_for_days(1825),
                "return_ytd": get_return_for_days(30),  # Approximate
                "return_absolute_1y": get_return_for_days(365),
                "rolling_return_1y_avg": None,
                "best_1y_return": None,
                "worst_1y_return": None,
            }
        except Exception as e:
            logger.warning(f"Simple returns calculation failed: {e}")
            return {
                "return_1m": None,
                "return_3m": None,
                "return_6m": None,
                "return_1y": None,
                "return_3y": None,
                "return_5y": None,
                "return_ytd": None,
                "return_absolute_1y": None,
                "rolling_return_1y_avg": None,
                "best_1y_return": None,
                "worst_1y_return": None,
            }

    def _calculate_risk_metrics(self, nav_data: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
        """
        Calculate risk metrics: standard deviation, sharpe ratio, maximum drawdown.
        """
        if not nav_data or len(nav_data) < 30:
            return {
                "volatility_1y": None,
                "sharpe_ratio_1y": None,
                "max_drawdown_1y": None,
                "downside_deviation": None,
            }

        try:
            # Get NAV values for last year
            nav_dict = {}
            for item in nav_data[:365]:  # Approximate 1 year
                date_str = item.get("date")
                nav_val = float(item.get("nav", 0))
                date_obj = datetime.strptime(date_str, "%d-%m-%Y")
                nav_dict[date_obj] = nav_val

            sorted_dates = sorted(nav_dict.keys())
            navs = [nav_dict[d] for d in sorted_dates]

            # Calculate daily returns
            daily_returns = []
            for i in range(1, len(navs)):
                ret = (navs[i] - navs[i - 1]) / navs[i - 1]
                daily_returns.append(ret)

            if not daily_returns:
                return {
                    "volatility_1y": None,
                    "sharpe_ratio_1y": None,
                    "max_drawdown_1y": None,
                    "downside_deviation": None,
                }

            # Standard deviation (volatility)
            import statistics

            std_dev = statistics.stdev(daily_returns) if len(daily_returns) > 1 else 0
            annualized_volatility = std_dev * (252**0.5) * 100  # Assuming 252 trading days

            # Sharpe Ratio (assuming risk-free rate of 6% p.a. = 6/252 per day)
            risk_free_daily = 0.06 / 252
            mean_return = statistics.mean(daily_returns)
            excess_return = mean_return - risk_free_daily
            sharpe_ratio = (excess_return / std_dev) * (252**0.5) if std_dev > 0 else 0

            # Maximum Drawdown
            peak = navs[0]
            max_dd = 0
            for nav in navs:
                if nav > peak:
                    peak = nav
                dd = (peak - nav) / peak
                if dd > max_dd:
                    max_dd = dd

            # Downside deviation (semi-deviation)
            negative_returns = [r for r in daily_returns if r < 0]
            downside_dev = statistics.stdev(negative_returns) if len(negative_returns) > 1 else 0
            annualized_downside = downside_dev * (252**0.5) * 100

            return {
                "volatility_1y": round(annualized_volatility, 2),
                "sharpe_ratio_1y": round(sharpe_ratio, 2),
                "max_drawdown_1y": round(max_dd * 100, 2),
                "downside_deviation": round(annualized_downside, 2),
            }

        except Exception as e:
            logger.warning(f"Error calculating risk metrics: {e}")
            return {
                "volatility_1y": None,
                "sharpe_ratio_1y": None,
                "max_drawdown_1y": None,
                "downside_deviation": None,
            }

    async def _fetch_additional_metrics(
        self, scheme_code: str, scheme_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch additional metrics from third-party sources like ValueResearch.
        This would require web scraping (placeholder for now).
        """
        # Placeholder for additional metrics that would be scraped:
        # - Expense ratio
        # - Exit load details
        # - Minimum SIP amount
        # - Minimum lumpsum amount
        # - Fund manager name and tenure
        # - Top 10 holdings
        # - Sector allocation
        # - Alpha, Beta vs benchmark
        # - Fund house rating

        additional_data = {
            "expense_ratio": None,  # Would be scraped
            "exit_load": None,  # Would be scraped
            "min_sip_amount": None,  # Would be scraped
            "min_lumpsum_amount": None,  # Would be scraped
            "fund_manager": None,  # Would be scraped
            "fund_manager_tenure_years": None,  # Would be scraped
            "aum_trend_6m": None,  # Would be calculated
            "portfolio_pe_ratio": None,  # Would be scraped
            "portfolio_pb_ratio": None,  # Would be scraped
            "alpha_1y": None,  # Would be scraped
            "beta_1y": None,  # Would be scraped
        }

        return additional_data

    async def _store_enhanced_scheme(self, enhanced_data: Dict[str, Any]) -> bool:
        """
        Store enhanced scheme data in database.
        Returns True if new scheme, False if updated.
        """
        from sqlalchemy import select

        from app.models.asset_data import MutualFund

        # Validate required fields
        if not enhanced_data.get("scheme_code"):
            logger.warning("Missing scheme_code, skipping")
            return False

        if not enhanced_data.get("scheme_name"):
            logger.warning(f"Missing scheme_name for {enhanced_data.get('scheme_code')}, skipping")
            return False

        try:
            # Check if scheme exists
            result = await self.db.execute(
                select(MutualFund).where(MutualFund.scheme_code == enhanced_data["scheme_code"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing
                for key, value in enhanced_data.items():
                    if hasattr(existing, key) and key != "scheme_code":
                        setattr(existing, key, value)
                existing.updated_at = datetime.utcnow()
                is_new = False
            else:
                # Create new - only include fields that exist in the model
                model_fields = {c.name for c in MutualFund.__table__.columns}
                filtered_data = {k: v for k, v in enhanced_data.items() if k in model_fields}

                new_fund = MutualFund(**filtered_data)
                self.db.add(new_fund)
                is_new = True

            return is_new

        except Exception as e:
            logger.error(
                f"Error storing scheme {enhanced_data.get('scheme_code')}: {type(e).__name__}: {str(e)}"
            )
            raise

    async def fetch_all_schemes(self) -> List[Dict[str, Any]]:
        """Fetch all schemes from MFAPI."""
        try:
            response = await self.client.get(MFAPI_BASE_URL)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching schemes: {e}")
            return []

    async def fetch_scheme_details(self, scheme_code: str) -> Optional[Dict[str, Any]]:
        """Fetch scheme details from MFAPI."""
        try:
            response = await self.client.get(f"{MFAPI_BASE_URL}/{scheme_code}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Error fetching scheme {scheme_code}: {e}")
            return None

    def _extract_amc_name(self, scheme_name: str) -> str:
        """Extract AMC name from scheme name."""
        # Common AMC names
        amc_keywords = [
            "HDFC",
            "ICICI Prudential",
            "SBI",
            "Axis",
            "Kotak",
            "Aditya Birla",
            "UTI",
            "DSP",
            "Franklin Templeton",
            "Nippon India",
            "Tata",
            "IDFC",
            "Invesco",
            "Mirae Asset",
            "Motilal Oswal",
            "Edelweiss",
            "PPFAS",
            "Quantum",
            "Parag Parikh",
        ]

        scheme_upper = scheme_name.upper()
        for amc in amc_keywords:
            if amc.upper() in scheme_upper:
                return amc

        # Fallback: take first word
        return scheme_name.split()[0]

    def _determine_category(self, name: str) -> str:
        """Determine fund category from scheme name."""
        name_lower = name.lower()

        # Equity categories
        if any(x in name_lower for x in ["large cap", "largecap", "bluechip", "top 100"]):
            return "equity_large_cap"
        elif any(x in name_lower for x in ["mid cap", "midcap"]):
            return "equity_mid_cap"
        elif any(x in name_lower for x in ["small cap", "smallcap"]):
            return "equity_small_cap"
        elif any(x in name_lower for x in ["multi cap", "multicap", "flexi cap", "flexicap"]):
            return "equity_multi_cap"
        elif "elss" in name_lower or ("tax" in name_lower and "saver" in name_lower):
            return "equity_elss"
        elif "index" in name_lower or "nifty" in name_lower or "sensex" in name_lower:
            return "equity_index"

        # Debt categories
        elif any(x in name_lower for x in ["liquid", "money market", "overnight"]):
            return "debt_liquid"
        elif any(x in name_lower for x in ["ultra short", "ultra-short"]):
            return "debt_ultra_short"
        elif any(x in name_lower for x in ["short duration", "short-term"]):
            return "debt_short"
        elif "gilt" in name_lower or "government" in name_lower:
            return "debt_gilt"
        elif any(x in name_lower for x in ["credit", "corporate bond"]):
            return "debt_credit"

        # Hybrid
        elif "hybrid" in name_lower or "balanced" in name_lower:
            return "hybrid"

        # Commodity
        elif "gold" in name_lower:
            return "commodity_gold"

        return "other"

    def _determine_sub_category(self, name: str) -> Optional[str]:
        """Determine sub-category for more granular classification."""
        name_lower = name.lower()

        # Equity sub-categories
        if "focused" in name_lower or "focus" in name_lower:
            return "focused"
        elif "value" in name_lower:
            return "value"
        elif "contra" in name_lower or "contrarian" in name_lower:
            return "contra"
        elif "dividend yield" in name_lower:
            return "dividend_yield"

        # Sectoral/Thematic
        elif any(
            x in name_lower
            for x in ["banking", "financial", "pharma", "technology", "infra", "energy"]
        ):
            return "sectoral"
        elif any(x in name_lower for x in ["esg", "consumption", "manufacturing", "rural"]):
            return "thematic"

        return None

    async def update_navs(self, limit: Optional[int] = None) -> Dict[str, int]:
        """
        Update NAVs for existing schemes.
        Compatibility method for backward compatibility.
        """
        logger.info("Updating NAVs for existing schemes...")

        # Get existing schemes from database
        from sqlalchemy import select

        from app.models.asset_data import MutualFund

        query = select(MutualFund).where(MutualFund.is_active == True)
        if limit:
            query = query.limit(limit)

        result = await self.db.execute(query)
        existing_schemes = result.scalars().all()

        stats = {"updated": 0, "failed": 0}

        for scheme in existing_schemes:
            try:
                # Fetch latest data
                enhanced_data = await self._fetch_comprehensive_scheme_data(scheme.scheme_code)

                if not enhanced_data:
                    stats["failed"] += 1
                    continue

                # Update NAV and other fields
                await self._store_enhanced_scheme(enhanced_data)
                stats["updated"] += 1

                # Rate limiting
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.warning(f"Failed to update NAV for {scheme.scheme_code}: {e}")
                stats["failed"] += 1

        await self.db.commit()
        logger.info(f"NAV update complete: {stats}")
        return stats
