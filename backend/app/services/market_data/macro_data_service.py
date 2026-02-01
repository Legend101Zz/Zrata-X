"""
Macro economic data service.
Uses reliable APIs with admin-updatable fallbacks.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

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
        
        # 2. RBI Policy Rates (from fallback, admin-updated)
        rbi_rates = self._get_fallback_rbi_rates()
        results["rbi_rates"] = rbi_rates
        for name, value in rbi_rates.items():
            if isinstance(value, (int, float)):
                await self._store_indicator(name, value, "percent", "RBI-Fallback")
        
        # 3. Inflation (CPI) - from fallback
        inflation = FALLBACK_MACRO_VALUES.get("cpi_inflation", {})
        cpi_value = inflation.get("value", 5.0)
        await self._store_indicator("cpi_inflation", cpi_value, "percent", "MOSPI-Fallback")
        results["inflation"] = {"cpi": cpi_value, "status": "fallback"}
        
        # 4. Try to fetch Nifty PE ratio
        nifty_pe = await self._fetch_nifty_pe()
        if nifty_pe:
            await self._store_indicator("nifty_pe", nifty_pe, "ratio", "NSE")
            results["nifty_pe"] = nifty_pe
        
        await self.db.commit()
        logger.info(f"Macro indicators refreshed: {list(results.keys())}")
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
            return {"usd_inr": last_rate, "status": "cached"}
        
        return {"usd_inr": 84.0, "status": "fallback"}
    
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
    
    async def _fetch_nifty_pe(self) -> Optional[float]:
        """Try to fetch Nifty 50 PE ratio."""
        try:
            # Using a public data endpoint
            response = await self.client.get(
                "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
            )
            if response.status_code == 200:
                data = response.json()
                pe = data.get("metadata", {}).get("pe")
                if pe:
                    return float(pe)
        except Exception as e:
            logger.debug(f"Nifty PE fetch failed (expected): {e}")
        
        # Return approximate value
        return 22.5
    
    async def _store_indicator(
        self,
        name: str,
        value: float,
        unit: str,
        source: str
    ):
        """Store indicator in database."""
        # Get previous value for change calculation
        prev = await self._get_last_indicator(name)
        change = None
        if prev:
            change = round((value - prev) / prev * 100, 2) if prev != 0 else 0
        
        indicator = MacroIndicator(
            indicator_name=name,
            value=value,
            previous_value=prev,
            change_percent=change,
            unit=unit,
            source=source,
            recorded_at=datetime.utcnow()
        )
        self.db.add(indicator)
    
    async def _get_last_indicator(self, name: str) -> Optional[float]:
        """Get last recorded value for an indicator."""
        result = await self.db.execute(
            select(MacroIndicator)
            .where(MacroIndicator.indicator_name == name)
            .order_by(desc(MacroIndicator.recorded_at))
            .limit(1)
        )
        indicator = result.scalar_one_or_none()
        return indicator.value if indicator else None
    
    async def get_all_indicators(self) -> Dict[str, Any]:
        """Get all current macro indicators."""
        indicators = {}
        
        result = await self.db.execute(
            select(MacroIndicator)
            .order_by(desc(MacroIndicator.recorded_at))
        )
        
        for ind in result.scalars().all():
            if ind.indicator_name not in indicators:
                indicators[ind.indicator_name] = {
                    "value": ind.value,
                    "previous": ind.previous_value,
                    "change_percent": ind.change_percent,
                    "unit": ind.unit,
                    "source": ind.source,
                    "recorded_at": ind.recorded_at.isoformat()
                }
        
        return indicators