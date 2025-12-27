"""
ETF data service - fetches ETF prices and info.
Uses NSE data and yfinance for historical data.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
import yfinance as yf
from app.models.asset_data import ETF
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ETFDataService:
    """
    Fetches and manages ETF data.
    Supports Gold, Silver, Index, and Sectoral ETFs.
    """
    
    # Common Indian ETFs with their Yahoo Finance symbols
    COMMON_ETFS = [
        # Gold ETFs
        {"symbol": "GOLDBEES.NS", "name": "Nippon India ETF Gold BeES", "underlying": "gold"},
        {"symbol": "GOLDCASE.NS", "name": "Axis Gold ETF", "underlying": "gold"},
        {"symbol": "HDFCGOLD.NS", "name": "HDFC Gold ETF", "underlying": "gold"},
        {"symbol": "ICICISILVER.NS", "name": "ICICI Prudential Silver ETF", "underlying": "silver"},
        
        # Silver ETFs
        {"symbol": "SILVERBEES.NS", "name": "Nippon India Silver ETF", "underlying": "silver"},
        {"symbol": "SILVERETF.NS", "name": "HDFC Silver ETF", "underlying": "silver"},
        
        # Index ETFs
        {"symbol": "NIFTYBEES.NS", "name": "Nippon India ETF Nifty BeES", "underlying": "nifty50"},
        {"symbol": "JUNIORBEES.NS", "name": "Nippon India ETF Junior BeES", "underlying": "niftynext50"},
        {"symbol": "BANKBEES.NS", "name": "Nippon India ETF Bank BeES", "underlying": "banknifty"},
        {"symbol": "SETFNIF50.NS", "name": "SBI ETF Nifty 50", "underlying": "nifty50"},
        {"symbol": "SETFNIFBK.NS", "name": "SBI ETF Nifty Bank", "underlying": "banknifty"},
        {"symbol": "ICICIB22.NS", "name": "ICICI Prudential Nifty ETF", "underlying": "nifty50"},
        {"symbol": "KOTAKNIFTY.NS", "name": "Kotak Nifty ETF", "underlying": "nifty50"},
        {"symbol": "HDFCNIFETF.NS", "name": "HDFC Nifty 50 ETF", "underlying": "nifty50"},
        
        # Sectoral ETFs
        {"symbol": "ITBEES.NS", "name": "Nippon India ETF Nifty IT", "underlying": "niftyit"},
        {"symbol": "PSUBNKBEES.NS", "name": "Nippon India ETF PSU Bank BeES", "underlying": "psubank"},
        {"symbol": "INFRABES.NS", "name": "Nippon India ETF Infra BeES", "underlying": "infra"},
        {"symbol": "CONSUMBEES.NS", "name": "Nippon India ETF Consumption", "underlying": "consumption"},
    ]
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def sync_etf_list(self) -> Dict[str, int]:
        """
        Sync ETF list to database.
        Adds any ETFs that don't exist yet.
        """
        added = 0
        updated = 0
        
        for etf_info in self.COMMON_ETFS:
            # Check if exists
            result = await self.db.execute(
                select(ETF).where(ETF.symbol == etf_info["symbol"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                existing.name = etf_info["name"]
                existing.underlying = etf_info["underlying"]
                updated += 1
            else:
                etf = ETF(
                    symbol=etf_info["symbol"],
                    name=etf_info["name"],
                    underlying=etf_info["underlying"],
                    nav=0.0,
                    market_price=0.0,
                    premium_discount=0.0,
                    exchange="NSE"
                )
                self.db.add(etf)
                added += 1
        
        await self.db.commit()
        logger.info(f"ETF sync complete: {added} added, {updated} updated")
        return {"added": added, "updated": updated}
    
    async def update_etf_prices(self) -> Dict[str, int]:
        """
        Update prices for all ETFs using yfinance.
        """
        # Get all ETFs from database
        result = await self.db.execute(select(ETF))
        etfs = list(result.scalars().all())
        
        if not etfs:
            logger.warning("No ETFs in database, running sync first")
            await self.sync_etf_list()
            result = await self.db.execute(select(ETF))
            etfs = list(result.scalars().all())
        
        updated = 0
        failed = 0
        
        # Fetch prices using yfinance (in batches)
        symbols = [etf.symbol for etf in etfs]
        
        try:
            # yfinance can fetch multiple tickers at once
            # Run in executor since yfinance is blocking
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(
                None, 
                lambda: yf.download(symbols, period="5d", progress=False)
            )
            
            for etf in etfs:
                try:
                    if etf.symbol in data['Close'].columns:
                        close_prices = data['Close'][etf.symbol].dropna()
                        if len(close_prices) > 0:
                            current_price = float(close_prices.iloc[-1])
                            
                            etf.market_price = current_price
                            etf.nav = current_price  # For ETFs, NAV ≈ market price
                            etf.premium_discount = 0.0  # Would need actual NAV to calculate
                            etf.updated_at = datetime.utcnow()
                            updated += 1
                        else:
                            failed += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.warning(f"Failed to update {etf.symbol}: {e}")
                    failed += 1
            
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"Error fetching ETF prices: {e}")
            failed = len(etfs)
        
        logger.info(f"ETF price update: {updated} updated, {failed} failed")
        return {"updated": updated, "failed": failed}
    
    async def get_etf_by_symbol(self, symbol: str) -> Optional[ETF]:
        """Get ETF by symbol."""
        result = await self.db.execute(
            select(ETF).where(ETF.symbol == symbol)
        )
        return result.scalar_one_or_none()
    
    async def get_etfs_by_underlying(self, underlying: str) -> List[ETF]:
        """Get all ETFs for a specific underlying (gold, silver, nifty50, etc.)"""
        result = await self.db.execute(
            select(ETF).where(ETF.underlying == underlying)
        )
        return list(result.scalars().all())
    
    async def get_all_etfs(self) -> List[ETF]:
        """Get all ETFs."""
        result = await self.db.execute(
            select(ETF).order_by(ETF.underlying, ETF.name)
        )
        return list(result.scalars().all())
    
    async def get_etf_historical_prices(
        self,
        symbol: str,
        days: int = 365
    ) -> List[Dict[str, Any]]:
        """
        Get historical prices for an ETF.
        """
        try:
            loop = asyncio.get_event_loop()
            
            # Map days to yfinance period
            if days <= 7:
                period = "7d"
            elif days <= 30:
                period = "1mo"
            elif days <= 90:
                period = "3mo"
            elif days <= 180:
                period = "6mo"
            elif days <= 365:
                period = "1y"
            elif days <= 730:
                period = "2y"
            else:
                period = "5y"
            
            data = await loop.run_in_executor(
                None,
                lambda: yf.download(symbol, period=period, progress=False)
            )
            
            if data.empty:
                return []
            
            history = []
            for date, row in data.iterrows():
                history.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": float(row["Open"]) if "Open" in row else None,
                    "high": float(row["High"]) if "High" in row else None,
                    "low": float(row["Low"]) if "Low" in row else None,
                    "close": float(row["Close"]) if "Close" in row else None,
                    "volume": int(row["Volume"]) if "Volume" in row else None,
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Error fetching ETF history for {symbol}: {e}")
            return []
    
    async def get_best_etf_for_underlying(
        self,
        underlying: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get the best ETF for a given underlying based on liquidity and expense ratio.
        """
        etfs = await self.get_etfs_by_underlying(underlying)
        
        if not etfs:
            return None
        
        # Simple ranking: prefer lower expense ratio and higher AUM
        # For now, just return the first one (typically the most popular)
        best = etfs[0]
        
        return {
            "symbol": best.symbol,
            "name": best.name,
            "market_price": best.market_price,
            "expense_ratio": best.expense_ratio,
            "aum": best.aum
        }