"""
Gold and Silver price service.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.config import get_settings
from app.models.asset_data import GoldSilverPrice
from app.seed_data.macro_indicators import FALLBACK_MACRO_VALUES
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


class GoldPriceService:
    """
    Fetches gold and silver prices from reliable APIs.
    
    Key principles:
    - Use APIs, not web scraping
    - Multiple fallback sources
    - Graceful degradation to last known price
    - For monthly investing, 24-hour delay is acceptable
    """
    
    # API sources in priority order
    GOLD_SILVER_APIS = [
        {
            "name": "goldapi.io",
            "gold_url": "https://www.goldapi.io/api/XAU/INR",
            "silver_url": "https://www.goldapi.io/api/XAG/INR",
            "requires_key": True,
            "key_header": "x-access-token",
            "response_path": "price",  # Response field for price
            "unit": "per_oz",  # Price is per troy ounce
        },
        {
            "name": "metals.dev",
            "base_url": "https://api.metals.dev/v1/latest",
            "requires_key": True,
            "response_path": "metals",
            "unit": "per_gram",
        },
        {
            "name": "frankfurter",  # Forex API - can derive from XAU/USD * USD/INR
            "gold_usd_url": "https://api.frankfurter.app/latest?from=XAU&to=USD",
            "usd_inr_url": "https://api.exchangerate-api.com/v4/latest/USD",
            "requires_key": False,
            "unit": "per_oz",
        },
    ]
    
    TROY_OZ_TO_GRAMS = 31.1035
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    async def fetch_and_store_prices(self) -> Dict[str, Any]:
        """
        Fetch current gold/silver prices and store in DB.
        Returns status dict with prices fetched.
        """
        results = {"gold": None, "silver": None, "source": None, "errors": []}
        
        # Strategy 1: GoldAPI.io (best accuracy for India)
        if settings.METALS_API_KEY:
            gold_price = await self._fetch_goldapi("gold")
            silver_price = await self._fetch_goldapi("silver")
            
            if gold_price and silver_price:
                results["gold"] = gold_price
                results["silver"] = silver_price
                results["source"] = "goldapi.io"
        
        # Strategy 2: Calculate from international price + forex
        if not results["gold"]:
            prices = await self._fetch_from_international()
            if prices:
                results.update(prices)
                results["source"] = "international_conversion"
        
        # Strategy 3: Use last known price
        if not results["gold"]:
            results["gold"] = await self._get_last_price("gold")
            results["silver"] = await self._get_last_price("silver")
            results["source"] = "cached"
            results["errors"].append("All APIs failed, using cached prices")
        
        # Store in database
        if results["gold"]:
            await self._store_price("gold", results["gold"])
        if results["silver"]:
            await self._store_price("silver", results["silver"])
        
        await self.db.commit()
        
        logger.info(f"Gold/Silver prices updated from {results['source']}: "
                   f"Gold={results.get('gold', {}).get('price_per_gram')}, "
                   f"Silver={results.get('silver', {}).get('price_per_gram')}")
        
        return results
    
    async def _fetch_goldapi(self, metal: str) -> Optional[Dict[str, float]]:
        """Fetch from GoldAPI.io (requires API key)."""
        symbol = "XAU" if metal == "gold" else "XAG"
        url = f"https://www.goldapi.io/api/{symbol}/INR"
        
        try:
            response = await self.client.get(
                url,
                headers={"x-access-token": settings.METALS_API_KEY}
            )
            if response.status_code == 200:
                data = response.json()
                price_per_oz = data.get("price")
                if price_per_oz:
                    price_per_gram = price_per_oz / self.TROY_OZ_TO_GRAMS
                    return {
                        "price_per_gram": round(price_per_gram, 2),
                        "price_per_10g": round(price_per_gram * 10, 2),
                        "price_per_oz": round(price_per_oz, 2),
                    }
        except Exception as e:
            logger.warning(f"GoldAPI failed for {metal}: {e}")
        
        return None
    
    async def _fetch_from_international(self) -> Optional[Dict[str, Any]]:
        """
        Calculate INR price from international gold/silver price.
        Uses free APIs: 
        - Gold/Silver USD price from metals.live
        - USD/INR from exchangerate-api
        """
        try:
            # Get USD/INR rate
            forex_response = await self.client.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            )
            if forex_response.status_code != 200:
                return None
            
            usd_inr = forex_response.json().get("rates", {}).get("INR")
            if not usd_inr:
                return None
            
            # Get gold price in USD per oz from free source
            # Using metals.live free API
            metals_response = await self.client.get(
                "https://api.metals.live/v1/spot"
            )
            
            gold_usd = None
            silver_usd = None
            
            if metals_response.status_code == 200:
                data = metals_response.json()
                for item in data:
                    if item.get("symbol") == "gold":
                        gold_usd = item.get("price")
                    elif item.get("symbol") == "silver":
                        silver_usd = item.get("price")
            
            # Alternative: Try another free source
            if not gold_usd:
                alt_response = await self.client.get(
                    "https://data-asg.goldprice.org/dbXRates/USD"
                )
                if alt_response.status_code == 200:
                    data = alt_response.json()
                    gold_usd = data.get("items", [{}])[0].get("xauPrice")
                    silver_usd = data.get("items", [{}])[0].get("xagPrice")
            
            if gold_usd and usd_inr:
                gold_inr_oz = gold_usd * usd_inr
                gold_inr_gram = gold_inr_oz / self.TROY_OZ_TO_GRAMS
                
                silver_inr_gram = None
                if silver_usd:
                    silver_inr_oz = silver_usd * usd_inr
                    silver_inr_gram = silver_inr_oz / self.TROY_OZ_TO_GRAMS
                
                return {
                    "gold": {
                        "price_per_gram": round(gold_inr_gram, 2),
                        "price_per_10g": round(gold_inr_gram * 10, 2),
                        "price_per_oz": round(gold_inr_oz, 2),
                    },
                    "silver": {
                        "price_per_gram": round(silver_inr_gram, 2) if silver_inr_gram else None,
                        "price_per_10g": round(silver_inr_gram * 10, 2) if silver_inr_gram else None,
                        "price_per_oz": round(silver_inr_oz, 2) if silver_usd else None,
                    } if silver_inr_gram else None
                }
        
        except Exception as e:
            logger.warning(f"International price calculation failed: {e}")
        
        return None
    
    async def _get_last_price(self, metal_type: str) -> Optional[Dict[str, float]]:
        """Get last known price from database."""
        result = await self.db.execute(
            select(GoldSilverPrice)
            .where(GoldSilverPrice.metal_type == metal_type)
            .order_by(desc(GoldSilverPrice.recorded_at))
            .limit(1)
        )
        price = result.scalar_one_or_none()
        
        if price:
            return {
                "price_per_gram": price.price_per_gram,
                "price_per_10g": price.price_per_10g,
                "price_per_oz": price.price_per_oz,
            }
        
        # Hardcoded fallback (approximate Dec 2024 prices)
        if metal_type == "gold":
            return {"price_per_gram": 6200, "price_per_10g": 62000, "price_per_oz": 192850}
        else:
            return {"price_per_gram": 75, "price_per_10g": 750, "price_per_oz": 2333}
    
    async def _store_price(self, metal_type: str, price_data: Dict[str, float]):
        """Store price in database."""
        if not price_data or not price_data.get("price_per_gram"):
            return
        
        price_record = GoldSilverPrice(
            metal_type=metal_type,
            price_per_gram=price_data["price_per_gram"],
            price_per_10g=price_data["price_per_10g"],
            price_per_oz=price_data.get("price_per_oz"),
            currency="INR",
            source="api",
            recorded_at=datetime.utcnow()
        )
        self.db.add(price_record)
    
    async def get_current_prices(self) -> Dict[str, Any]:
        """Get current gold and silver prices."""
        gold = await self._get_last_price("gold")
        silver = await self._get_last_price("silver")
        
        return {
            "gold": gold,
            "silver": silver,
            "currency": "INR",
            "fetched_at": datetime.utcnow().isoformat()
        }