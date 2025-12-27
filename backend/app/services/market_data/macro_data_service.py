"""
Macro economic data service - RBI rates, inflation, etc.
"""
import logging
import re
from datetime import datetime
from typing import Any, Dict, List

import httpx
from app.models.asset_data import MacroIndicator
from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class MacroDataService:
    """
    Fetches and stores macro economic indicators.
    Data sources: RBI, Trading Economics, government sites.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def refresh_all_indicators(self) -> Dict[str, Any]:
        """Refresh all macro indicators."""
        results = {}
        
        # RBI Policy Rates
        rbi_rates = await self._fetch_rbi_rates()
        if rbi_rates:
            results["rbi_rates"] = rbi_rates
            for rate_name, rate_value in rbi_rates.items():
                await self._store_indicator(rate_name, rate_value, "percent", "RBI")
        
        # Inflation data
        inflation = await self._fetch_inflation_data()
        if inflation:
            results["inflation"] = inflation
            await self._store_indicator("cpi_inflation", inflation["cpi"], "percent", "MOSPI")
        
        # USD/INR rate
        forex = await self._fetch_forex_rate()
        if forex:
            results["forex"] = forex
            await self._store_indicator("usd_inr", forex["usd_inr"], "INR", "RBI")
        
        await self.db.commit()
        return results
    
    async def _fetch_rbi_rates(self) -> Dict[str, float]:
        """Fetch RBI policy rates."""
        try:
            browser_config = BrowserConfig(headless=True)
            crawler_config = CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                wait_for="networkidle"
            )
            
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(
                    url="https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx",
                    config=crawler_config
                )
                
                if result.success:
                    text = result.markdown or ""
                    
                    rates = {}
                    
                    # Parse repo rate
                    repo_match = re.search(r'Repo\s*Rate[:\s]*([\d.]+)\s*%', text, re.IGNORECASE)
                    if repo_match:
                        rates["repo_rate"] = float(repo_match.group(1))
                    
                    # Parse reverse repo
                    reverse_repo_match = re.search(r'Reverse\s*Repo[:\s]*([\d.]+)\s*%', text, re.IGNORECASE)
                    if reverse_repo_match:
                        rates["reverse_repo_rate"] = float(reverse_repo_match.group(1))
                    
                    # Parse CRR
                    crr_match = re.search(r'CRR[:\s]*([\d.]+)\s*%', text, re.IGNORECASE)
                    if crr_match:
                        rates["crr"] = float(crr_match.group(1))
                    
                    return rates if rates else None
                    
        except Exception as e:
            logger.error(f"Failed to fetch RBI rates: {e}")
        
        # Fallback to hardcoded recent values (should be updated via admin)
        return {
            "repo_rate": 6.5,  # As of late 2024
            "reverse_repo_rate": 3.35,
            "crr": 4.5
        }
    
    async def _fetch_inflation_data(self) -> Dict[str, float]:
        """Fetch inflation data."""
        try:
            # Try Trading Economics API or scrape
            browser_config = BrowserConfig(headless=True)
            crawler_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
            
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(
                    url="https://tradingeconomics.com/india/inflation-cpi",
                    config=crawler_config
                )
                
                if result.success:
                    text = result.markdown or ""
                    
                    # Look for inflation rate
                    match = re.search(r'India.*?Inflation.*?([\d.]+)\s*%', text, re.IGNORECASE)
                    if match:
                        return {"cpi": float(match.group(1))}
                        
        except Exception as e:
            logger.error(f"Failed to fetch inflation data: {e}")
        
        return {"cpi": 5.0}  # Fallback
    
    async def _fetch_forex_rate(self) -> Dict[str, float]:
        """Fetch USD/INR exchange rate."""
        try:
            # Use a free forex API
            response = await self.client.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            )
            if response.status_code == 200:
                data = response.json()
                inr_rate = data.get("rates", {}).get("INR")
                if inr_rate:
                    return {"usd_inr": inr_rate}
        except Exception as e:
            logger.error(f"Failed to fetch forex rate: {e}")
        
        return {"usd_inr": 83.0}  # Fallback
    
    async def _store_indicator(
        self,
        name: str,
        value: float,
        unit: str,
        source: str
    ):
        """Store an indicator in the database."""
        # Get previous value
        from sqlalchemy import desc, select
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
            source=source
        )
        self.db.add(indicator)
    
    async def get_indicator_history(
        self,
        indicator_name: str,
        days: int = 365
    ) -> List[Dict[str, Any]]:
        """Get historical values for an indicator."""
        from datetime import timedelta

        from sqlalchemy import desc, select
        
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        result = await self.db.execute(
            select(MacroIndicator)
            .where(
                MacroIndicator.indicator_name == indicator_name,
                MacroIndicator.recorded_at >= cutoff
            )
            .order_by(desc(MacroIndicator.recorded_at))
        )
        
        return [
            {
                "value": ind.value,
                "date": ind.recorded_at.isoformat(),
                "change": ind.change_percent
            }
            for ind in result.scalars().all()
        ]