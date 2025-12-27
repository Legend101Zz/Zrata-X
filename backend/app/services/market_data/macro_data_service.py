"""
Macro economic data service.
Uses reliable APIs with admin-updatable fallbacks.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.config import get_settings
from app.models.asset_data import MacroIndicator
from app.seed_data.macro_indicators import FALLBACK_MACRO_VALUES
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


class MacroDataService:
    """
    Fetches and stores macro economic indicators.
    
    Design principles:
    - Use reliable APIs, not web scraping
    - Admin-updatable fallback values for when APIs fail
    - RBI rates change infrequently (6x/year), so stale data is acceptable
    - Inflation data is monthly, so daily freshness isn't critical
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    async def refresh_all_indicators(self) -> Dict[str, Any]:
        """Refresh all macro indicators from available sources."""
        results = {}
        
        # 1. USD/INR Exchange Rate (reliable free API)
        forex = await self._fetch_forex_rate()
        if forex:
            await self._store_indicator("usd_inr", forex["usd_inr"], "INR", "ExchangeRate-API")
            results["usd_inr"] = forex
        
        # 2. RBI Policy Rates
        # These change only during MPC meetings (~6x/year)
        # We try to fetch from reliable sources, fallback to admin-set values
        rbi_rates = await self._fetch_rbi_rates()
        if rbi_rates:
            results["rbi_rates"] = rbi_rates
            for name, value in rbi_rates.items():
                await self._store_indicator(name, value, "percent", "RBI")
        else:
            # Use admin-set fallback values
            results["rbi_rates"] = self._get_fallback_rbi_rates()
            logger.info("Using fallback RBI rates - update via admin panel if stale")
        
        # 3. Inflation (CPI)
        # Released monthly by MOSPI
        inflation = await self._fetch_inflation()
        if inflation:
            await self._store_indicator("cpi_inflation", inflation["cpi"], "percent", "MOSPI")
            results["inflation"] = inflation
        else:
            fallback = FALLBACK_MACRO_VALUES.get("cpi_inflation", {})
            results["inflation"] = {"cpi": fallback.get("value", 5.0), "status": "fallback"}
        
        await self.db.commit()
        return results
    
    async def _fetch_forex_rate(self) -> Optional[Dict[str, float]]:
        """Fetch USD/INR rate from free API."""
        try:
            response = await self.client.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            )
            if response.status_code == 200:
                data = response.json()
                inr_rate = data.get("rates", {}).get("INR")
                if inr_rate:
                    return {
                        "usd_inr": round(inr_rate, 2),
                        "source": "exchangerate-api.com",
                        "fetched_at": datetime.utcnow().isoformat(),
                    }
        except Exception as e:
            logger.warning(f"Forex API failed: {e}")
        
        # Fallback to last known rate
        last_rate = await self._get_last_indicator("usd_inr")
        if last_rate:
            return {"usd_inr": last_rate, "status": "stale"}
        
        return {"usd_inr": 84.0, "status": "fallback"}  # Approximate Dec 2024
    
    async def _fetch_rbi_rates(self) -> Optional[Dict[str, float]]:
        """
        Fetch RBI policy rates.
        
        Note: RBI doesn't have a public API for real-time rates.
        Options:
        1. Scrape RBI website (fragile)
        2. Use third-party data providers (costly)
        3. Admin-updated values (reliable for monthly updates)
        
        For a monthly investment app, we use option 3 with periodic admin updates.
        """
        # Check if we have recent data (RBI rates change ~6x/year)
        last_repo = await self._get_last_indicator("repo_rate")
        last_updated = await self._get_indicator_last_updated("repo_rate")
        
        # If we have data less than 7 days old, use it
        if last_updated and (datetime.utcnow() - last_updated) < timedelta(days=7):
            return {
                "repo_rate": last_repo,
                "status": "cached",
            }
        
        # Try to fetch from a financial data API (if configured)
        # Example: Alpha Vantage, Quandl, etc.
        # For now, return None to trigger fallback
        return None
    
    def _get_fallback_rbi_rates(self) -> Dict[str, Any]:
        """Get admin-set fallback RBI rates."""
        return {
            "repo_rate": FALLBACK_MACRO_VALUES.get("repo_rate", {}).get("value", 6.5),
            "reverse_repo_rate": FALLBACK_MACRO_VALUES.get("reverse_repo_rate", {}).get("value", 3.35),
            "crr": FALLBACK_MACRO_VALUES.get("crr", {}).get("value", 4.0),
            "slr": FALLBACK_MACRO_VALUES.get("slr", {}).get("value", 18.0),
            "status": "admin_fallback",
            "as_of": FALLBACK_MACRO_VALUES.get("repo_rate", {}).get("as_of", "unknown"),
        }
    
    async def _fetch_inflation(self) -> Optional[Dict[str, float]]:
        """
        Fetch inflation data.
        
        Note: MOSPI releases CPI data monthly (~12th of each month).
        There's no public API, so we use:
        1. Third-party data providers (if configured)
        2. Admin-updated values
        """
        # Check for recent cached data
        last_cpi = await self._get_last_indicator("cpi_inflation")
        last_updated = await self._get_indicator_last_updated("cpi_inflation")
        
        # CPI is released monthly, so 30-day cache is fine
        if last_updated and (datetime.utcnow() - last_updated) < timedelta(days=30):
            return {"cpi": last_cpi, "status": "cached"}
        
        return None
    
    async def _store_indicator(
        self,
        name: str,
        value: float,
        unit: str,
        source: str
    ):
        """Store an indicator in the database."""
        # Get previous value for change calculation
        result = await self.db.execute(
            select(MacroIndicator)
            .where(MacroIndicator.indicator_name == name)
            .order_by(desc(MacroIndicator.recorded_at))
            .limit(1)
        )
        previous = result.scalar_one_or_none()
        
        previous_value = previous.value if previous else None
        change_percent = None
        if previous_value and previous_value != 0:
            change_percent = ((value - previous_value) / previous_value) * 100
        
        indicator = MacroIndicator(
            indicator_name=name,
            value=value,
            previous_value=previous_value,
            change_percent=change_percent,
            unit=unit,
            source=source,
        )
        self.db.add(indicator)
    
    async def _get_last_indicator(self, name: str) -> Optional[float]:
        """Get last value for an indicator."""
        result = await self.db.execute(
            select(MacroIndicator.value)
            .where(MacroIndicator.indicator_name == name)
            .order_by(desc(MacroIndicator.recorded_at))
            .limit(1)
        )
        row = result.first()
        return row[0] if row else None
    
    async def _get_indicator_last_updated(self, name: str) -> Optional[datetime]:
        """Get when an indicator was last updated."""
        result = await self.db.execute(
            select(MacroIndicator.recorded_at)
            .where(MacroIndicator.indicator_name == name)
            .order_by(desc(MacroIndicator.recorded_at))
            .limit(1)
        )
        row = result.first()
        return row[0] if row else None
    
    async def get_current_snapshot(self) -> Dict[str, Any]:
        """Get current values of all indicators."""
        indicators = {}
        
        for name in ["repo_rate", "reverse_repo_rate", "crr", "slr", "cpi_inflation", "usd_inr"]:
            value = await self._get_last_indicator(name)
            updated_at = await self._get_indicator_last_updated(name)
            
            if value is not None:
                indicators[name] = {
                    "value": value,
                    "updated_at": updated_at.isoformat() if updated_at else None,
                }
            else:
                # Use fallback
                fallback = FALLBACK_MACRO_VALUES.get(name, {})
                indicators[name] = {
                    "value": fallback.get("value"),
                    "status": "fallback",
                    "as_of": fallback.get("as_of"),
                }
        
        return indicators
    
    async def admin_update_indicator(
        self,
        name: str,
        value: float,
        source: str = "admin_manual"
    ):
        """
        Admin function to manually update an indicator.
        Use this when automated fetching fails.
        """
        await self._store_indicator(name, value, "percent", source)
        await self.db.commit()
        logger.info(f"Admin updated {name} to {value}")