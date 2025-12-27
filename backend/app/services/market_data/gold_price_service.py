"""
Gold and Silver price fetching service.
"""
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import httpx
from app.config import get_settings
from app.models.asset_data import DigitalGoldProvider, GoldSilverPrice
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


class GoldPriceService:
    """
    Fetches gold and silver prices from multiple sources.
    Falls back gracefully if one source fails.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_and_store_prices(self) -> Dict[str, Any]:
        """Fetch current gold/silver prices and store in DB."""
        prices = {}
        
        # Try multiple sources
        gold_price = await self._fetch_gold_price()
        silver_price = await self._fetch_silver_price()
        
        if gold_price:
            gold_record = GoldSilverPrice(
                metal_type="gold",
                price_per_gram=gold_price["per_gram"],
                price_per_10g=gold_price["per_10g"],
                price_per_oz=gold_price.get("per_oz"),
                currency="INR",
                source=gold_price["source"]
            )
            self.db.add(gold_record)
            prices["gold"] = gold_price
        
        if silver_price:
            silver_record = GoldSilverPrice(
                metal_type="silver",
                price_per_gram=silver_price["per_gram"],
                price_per_10g=silver_price["per_10g"],
                price_per_oz=silver_price.get("per_oz"),
                currency="INR",
                source=silver_price["source"]
            )
            self.db.add(silver_record)
            prices["silver"] = silver_price
        
        await self.db.commit()
        return prices
    
    async def _fetch_gold_price(self) -> Optional[Dict[str, Any]]:
        """Fetch gold price from available sources."""
        # Try gold-api.com (free tier)
        try:
            response = await self.client.get(
                "https://www.goldapi.io/api/XAU/INR",
                headers={"x-access-token": settings.METALS_API_KEY} if settings.METALS_API_KEY else {}
            )
            if response.status_code == 200:
                data = response.json()
                price_per_oz = data.get("price", 0)
                price_per_gram = price_per_oz / 31.1035  # Troy ounce to gram
                return {
                    "per_gram": round(price_per_gram, 2),
                    "per_10g": round(price_per_gram * 10, 2),
                    "per_oz": price_per_oz,
                    "source": "goldapi.io"
                }
        except Exception as e:
            logger.warning(f"goldapi.io failed: {e}")
        
        # Fallback: Try metals.dev
        try:
            response = await self.client.get(
                "https://api.metals.dev/v1/latest",
                params={"api_key": settings.METALS_API_KEY, "currency": "INR", "unit": "g"}
            )
            if response.status_code == 200:
                data = response.json()
                gold_price = data.get("metals", {}).get("gold", 0)
                return {
                    "per_gram": round(gold_price, 2),
                    "per_10g": round(gold_price * 10, 2),
                    "source": "metals.dev"
                }
        except Exception as e:
            logger.warning(f"metals.dev failed: {e}")
        
        # Fallback: Scrape from public source
        return await self._scrape_gold_price()
    
    async def _fetch_silver_price(self) -> Optional[Dict[str, Any]]:
        """Fetch silver price from available sources."""
        try:
            response = await self.client.get(
                "https://www.goldapi.io/api/XAG/INR",
                headers={"x-access-token": settings.METALS_API_KEY} if settings.METALS_API_KEY else {}
            )
            if response.status_code == 200:
                data = response.json()
                price_per_oz = data.get("price", 0)
                price_per_gram = price_per_oz / 31.1035
                return {
                    "per_gram": round(price_per_gram, 2),
                    "per_10g": round(price_per_gram * 10, 2),
                    "per_oz": price_per_oz,
                    "source": "goldapi.io"
                }
        except Exception as e:
            logger.warning(f"Silver price fetch failed: {e}")
        
        return None
    
    async def _scrape_gold_price(self) -> Optional[Dict[str, Any]]:
        """Fallback: Scrape gold price from public website."""
        from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                              CrawlerRunConfig)
        
        try:
            browser_config = BrowserConfig(headless=True)
            crawler_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
            
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(
                    url="https://www.goodreturns.in/gold-rates/",
                    config=crawler_config
                )
                
                if result.success:
                    # Parse the markdown/HTML for gold price
                    # This is a simplified example - actual parsing would need adjustment
                    import re
                    text = result.markdown or ""
                    
                    # Look for patterns like "₹7,500" or "Rs. 7500"
                    match = re.search(r'22K.*?₹?\s*([\d,]+)', text)
                    if match:
                        price_22k = float(match.group(1).replace(',', ''))
                        price_24k = price_22k * (24/22)  # Convert to 24K
                        return {
                            "per_gram": round(price_24k, 2),
                            "per_10g": round(price_24k * 10, 2),
                            "source": "goodreturns.in"
                        }
        except Exception as e:
            logger.error(f"Gold price scraping failed: {e}")
        
        return None
    
    async def update_digital_gold_providers(self):
        """Update digital gold provider prices."""
        providers_to_check = [
            {
                "name": "Paytm Gold",
                "url": "https://paytm.com/gold",
                "scrape": True
            },
            {
                "name": "PhonePe Gold", 
                "url": "https://www.phonepe.com/gold/",
                "scrape": True
            },
            {
                "name": "Google Pay Gold",
                "url": "https://pay.google.com/",
                "scrape": True
            }
        ]
        
        # This would involve scraping each provider
        # For now, we'll just log that this needs implementation
        logger.info("Digital gold provider update - implement scraping for each provider")