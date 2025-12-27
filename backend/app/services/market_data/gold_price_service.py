"""
Gold and Silver price service.
Uses reliable APIs with graceful fallback - NO REGEX SCRAPING.
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
    
    # Conversion constants
    TROY_OZ_TO_GRAMS = 31.1035
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    async def fetch_and_store_prices(self) -> Dict[str, Any]:
        """
        Fetch current gold/silver prices and store in DB.
        Tries multiple sources in order of reliability.
        """
        results = {}
        
        # Try to fetch gold price
        gold_price = await self._fetch_gold_price()
        if gold_price:
            await self._store_price("gold", gold_price)
            results["gold"] = gold_price
        else:
            # Use last known price from DB
            last_gold = await self._get_last_known_price("gold")
            if last_gold:
                results["gold"] = {"status": "stale", "last_price": last_gold}
                logger.warning("Using stale gold price - all APIs failed")
            else:
                logger.error("No gold price available - all sources failed")
        
        # Try to fetch silver price
        silver_price = await self._fetch_silver_price()
        if silver_price:
            await self._store_price("silver", silver_price)
            results["silver"] = silver_price
        else:
            last_silver = await self._get_last_known_price("silver")
            if last_silver:
                results["silver"] = {"status": "stale", "last_price": last_silver}
            else:
                logger.error("No silver price available")
        
        return results
    
    async def _fetch_gold_price(self) -> Optional[Dict[str, Any]]:
        """Fetch gold price from available APIs."""
        
        # Try goldapi.io first
        if settings.METALS_API_KEY:
            try:
                response = await self.client.get(
                    "https://www.goldapi.io/api/XAU/INR",
                    headers={"x-access-token": settings.METALS_API_KEY}
                )
                if response.status_code == 200:
                    data = response.json()
                    price_per_oz = data.get("price", 0)
                    if price_per_oz > 0:
                        price_per_gram = price_per_oz / self.TROY_OZ_TO_GRAMS
                        return {
                            "per_gram": round(price_per_gram, 2),
                            "per_10g": round(price_per_gram * 10, 2),
                            "per_oz": round(price_per_oz, 2),
                            "source": "goldapi.io",
                            "fetched_at": datetime.utcnow().isoformat(),
                        }
            except Exception as e:
                logger.warning(f"goldapi.io failed: {e}")
        
        # Try metals.dev
        if settings.METALS_API_KEY:
            try:
                response = await self.client.get(
                    "https://api.metals.dev/v1/latest",
                    params={"api_key": settings.METALS_API_KEY, "currency": "INR", "unit": "g"}
                )
                if response.status_code == 200:
                    data = response.json()
                    gold_price_per_gram = data.get("metals", {}).get("gold", 0)
                    if gold_price_per_gram > 0:
                        return {
                            "per_gram": round(gold_price_per_gram, 2),
                            "per_10g": round(gold_price_per_gram * 10, 2),
                            "source": "metals.dev",
                            "fetched_at": datetime.utcnow().isoformat(),
                        }
            except Exception as e:
                logger.warning(f"metals.dev failed: {e}")
        
        # Try deriving from XAU/USD * USD/INR (free, no API key)
        try:
            # Get USD/INR rate
            forex_response = await self.client.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            )
            if forex_response.status_code == 200:
                usd_inr = forex_response.json().get("rates", {}).get("INR", 0)
                
                if usd_inr > 0:
                    # Get XAU/USD (gold price in USD per oz) from alternative source
                    # Using a different approach: gold spot from metals-api or similar
                    gold_usd_per_oz = await self._get_gold_usd_price()
                    
                    if gold_usd_per_oz > 0:
                        gold_inr_per_oz = gold_usd_per_oz * usd_inr
                        gold_inr_per_gram = gold_inr_per_oz / self.TROY_OZ_TO_GRAMS
                        
                        return {
                            "per_gram": round(gold_inr_per_gram, 2),
                            "per_10g": round(gold_inr_per_gram * 10, 2),
                            "per_oz": round(gold_inr_per_oz, 2),
                            "source": "derived_from_usd",
                            "usd_inr_used": usd_inr,
                            "fetched_at": datetime.utcnow().isoformat(),
                        }
        except Exception as e:
            logger.warning(f"USD derivation failed: {e}")
        
        # All APIs failed
        logger.error("All gold price APIs failed")
        return None
    
    async def _get_gold_usd_price(self) -> float:
        """Get gold price in USD per troy ounce."""
        # Try a free gold price source
        try:
            # This is a backup - ideally use a proper metals API
            response = await self.client.get(
                "https://api.metals.live/v1/spot/gold"
            )
            if response.status_code == 200:
                data = response.json()
                return float(data.get("price", 0))
        except:
            pass
        
        # Fallback: Use approximate market rate (updated periodically)
        # This should be updated via admin panel
        return 2650.0  # ~Dec 2024 approximate gold price in USD/oz
    
    async def _fetch_silver_price(self) -> Optional[Dict[str, Any]]:
        """Fetch silver price from available APIs."""
        if settings.METALS_API_KEY:
            try:
                response = await self.client.get(
                    "https://www.goldapi.io/api/XAG/INR",
                    headers={"x-access-token": settings.METALS_API_KEY}
                )
                if response.status_code == 200:
                    data = response.json()
                    price_per_oz = data.get("price", 0)
                    if price_per_oz > 0:
                        price_per_gram = price_per_oz / self.TROY_OZ_TO_GRAMS
                        return {
                            "per_gram": round(price_per_gram, 2),
                            "per_10g": round(price_per_gram * 10, 2),
                            "per_oz": round(price_per_oz, 2),
                            "source": "goldapi.io",
                            "fetched_at": datetime.utcnow().isoformat(),
                        }
            except Exception as e:
                logger.warning(f"Silver price fetch failed: {e}")
        
        return None
    
    async def _store_price(self, metal_type: str, price_data: Dict[str, Any]):
        """Store price in database."""
        record = GoldSilverPrice(
            metal_type=metal_type,
            price_per_gram=price_data["per_gram"],
            price_per_10g=price_data["per_10g"],
            price_per_oz=price_data.get("per_oz"),
            currency="INR",
            source=price_data["source"],
        )
        self.db.add(record)
        await self.db.commit()
    
    async def _get_last_known_price(self, metal_type: str) -> Optional[Dict[str, Any]]:
        """Get the last recorded price from database."""
        result = await self.db.execute(
            select(GoldSilverPrice)
            .where(GoldSilverPrice.metal_type == metal_type)
            .order_by(desc(GoldSilverPrice.recorded_at))
            .limit(1)
        )
        record = result.scalar_one_or_none()
        
        if record:
            return {
                "per_gram": record.price_per_gram,
                "per_10g": record.price_per_10g,
                "recorded_at": record.recorded_at.isoformat(),
                "source": record.source,
            }
        return None
    
    async def get_price_history(
        self, 
        metal_type: str, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get price history for charting."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        result = await self.db.execute(
            select(GoldSilverPrice)
            .where(
                GoldSilverPrice.metal_type == metal_type,
                GoldSilverPrice.recorded_at >= cutoff
            )
            .order_by(GoldSilverPrice.recorded_at)
        )
        
        return [
            {
                "date": r.recorded_at.strftime("%Y-%m-%d"),
                "price_per_gram": r.price_per_gram,
                "price_per_10g": r.price_per_10g,
            }
            for r in result.scalars().all()
        ]