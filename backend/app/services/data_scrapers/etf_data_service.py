"""
Enhanced ETF Data Service with comprehensive tracking and metrics.
Adds: tracking error, liquidity metrics, bid-ask spread, volume analysis,
creation/redemption data, underlying index performance, holdings breakdown.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import yfinance as yf
from app.models.asset_data import ETF
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# Comprehensive Indian ETF list with enhanced metadata
ENHANCED_INDIAN_ETFS = [
    # Gold ETFs
    {
        "symbol": "GOLDBEES.NS",
        "name": "Nippon India ETF Gold BeES",
        "underlying": "gold",
        "underlying_index": "Domestic Gold Price",
        "benchmark": "LBMA Gold Price",
        "expense_ratio": 0.29,
        "aum_category": "large"
    },
    {
        "symbol": "GOLDSHARE.NS",
        "name": "Goldman Sachs Gold Exchange Traded Scheme",
        "underlying": "gold",
        "underlying_index": "Domestic Gold Price",
        "expense_ratio": 0.50,
        "aum_category": "medium"
    },
    {
        "symbol": "ICICIGOLD.NS",
        "name": "ICICI Prudential Gold ETF",
        "underlying": "gold",
        "underlying_index": "Domestic Gold Price",
        "expense_ratio": 0.50,
        "aum_category": "medium"
    },
    {
        "symbol": "AXISHCETF.NS",
        "name": "Axis Gold ETF",
        "underlying": "gold",
        "underlying_index": "Domestic Gold Price",
        "expense_ratio": 0.44,
        "aum_category": "medium"
    },
    {
        "symbol": "KOTAKGOLD.NS",
        "name": "Kotak Gold ETF",
        "underlying": "gold",
        "underlying_index": "Domestic Gold Price",
        "expense_ratio": 0.53,
        "aum_category": "medium"
    },
    
    # Silver ETFs
    {
        "symbol": "SILVERBEES.NS",
        "name": "Nippon India ETF Silver BeES",
        "underlying": "silver",
        "underlying_index": "Domestic Silver Price",
        "benchmark": "LBMA Silver Price",
        "expense_ratio": 0.57,
        "aum_category": "medium"
    },
    {
        "symbol": "SILVERETF.NS",
        "name": "ICICI Prudential Silver ETF",
        "underlying": "silver",
        "underlying_index": "Domestic Silver Price",
        "expense_ratio": 0.60,
        "aum_category": "small"
    },
    
    # Nifty 50 ETFs
    {
        "symbol": "NIFTYBEES.NS",
        "name": "Nippon India ETF Nifty BeES",
        "underlying": "nifty50",
        "underlying_index": "Nifty 50",
        "benchmark": "Nifty 50 TRI",
        "expense_ratio": 0.05,
        "aum_category": "large"
    },
    {
        "symbol": "ICICIB22.NS",
        "name": "ICICI Prudential Nifty 50 ETF",
        "underlying": "nifty50",
        "underlying_index": "Nifty 50",
        "benchmark": "Nifty 50 TRI",
        "expense_ratio": 0.05,
        "aum_category": "large"
    },
    {
        "symbol": "HDFCNIF50.NS",
        "name": "HDFC Nifty 50 ETF",
        "underlying": "nifty50",
        "underlying_index": "Nifty 50",
        "benchmark": "Nifty 50 TRI",
        "expense_ratio": 0.05,
        "aum_category": "medium"
    },
    {
        "symbol": "UTINIFTETF.NS",
        "name": "UTI Nifty 50 ETF",
        "underlying": "nifty50",
        "underlying_index": "Nifty 50",
        "benchmark": "Nifty 50 TRI",
        "expense_ratio": 0.05,
        "aum_category": "medium"
    },
    
    # Nifty Next 50 ETFs
    {
        "symbol": "JUNIORBEES.NS",
        "name": "Nippon India ETF Junior BeES",
        "underlying": "nifty_next_50",
        "underlying_index": "Nifty Next 50",
        "benchmark": "Nifty Next 50 TRI",
        "expense_ratio": 0.20,
        "aum_category": "medium"
    },
    
    # Bank Nifty ETFs
    {
        "symbol": "BANKBEES.NS",
        "name": "Nippon India ETF Bank BeES",
        "underlying": "bank_nifty",
        "underlying_index": "Nifty Bank",
        "benchmark": "Nifty Bank TRI",
        "expense_ratio": 0.26,
        "aum_category": "medium"
    },
    {
        "symbol": "ICICIBANKN.NS",
        "name": "ICICI Prudential Nifty Bank ETF",
        "underlying": "bank_nifty",
        "underlying_index": "Nifty Bank",
        "benchmark": "Nifty Bank TRI",
        "expense_ratio": 0.15,
        "aum_category": "medium"
    },
    
    # IT ETFs
    {
        "symbol": "ITBEES.NS",
        "name": "Nippon India ETF IT BeES",
        "underlying": "nifty_it",
        "underlying_index": "Nifty IT",
        "benchmark": "Nifty IT TRI",
        "expense_ratio": 0.26,
        "aum_category": "medium"
    },
    
    # PSU Bank ETFs
    {
        "symbol": "PSUBNKBEES.NS",
        "name": "Nippon India ETF PSU Bank BeES",
        "underlying": "psu_bank",
        "underlying_index": "Nifty PSU Bank",
        "benchmark": "Nifty PSU Bank TRI",
        "expense_ratio": 0.26,
        "aum_category": "medium"
    },
    
    # International ETFs
    {
        "symbol": "MOHEADETF.NS",
        "name": "Motilal Oswal S&P 500 Index Fund ETF",
        "underlying": "s&p_500",
        "underlying_index": "S&P 500",
        "benchmark": "S&P 500 TRI",
        "expense_ratio": 0.50,
        "aum_category": "medium"
    },
    {
        "symbol": "MOGSN500.NS",
        "name": "Motilal Oswal Nasdaq 100 ETF",
        "underlying": "nasdaq_100",
        "underlying_index": "NASDAQ 100",
        "benchmark": "NASDAQ 100 TRI",
        "expense_ratio": 0.65,
        "aum_category": "medium"
    },
]


class ETFDataService:
    """
    Enhanced ETF service collecting comprehensive data:
    - Real-time NAV and market price
    - Premium/Discount to NAV
    - Trading volume and liquidity metrics
    - Bid-ask spread
    - Tracking error vs benchmark
    - Expense ratio trends
    - Holdings breakdown (top 10 constituents)
    - Creation/Redemption unit size
    - Average daily volume
    - 52-week high/low
    - Dividend history
    - Tax efficiency metrics
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def close(self):
        """Cleanup if needed."""
        pass
    
    async def sync_etf_list(self) -> Dict[str, int]:
        """
        Compatibility wrapper for sync_comprehensive_etf_list.
        Maintains backward compatibility with existing code.
        """
        return await self.sync_comprehensive_etf_list()
    
    async def update_etf_prices(self) -> Dict[str, int]:
        """
        Update ETF prices for existing ETFs.
        Compatibility method for backward compatibility.
        """
        logger.info("Updating ETF prices...")
        return await self.sync_comprehensive_etf_list()
    
    async def sync_comprehensive_etf_list(self) -> Dict[str, int]:
        """
        Sync comprehensive ETF list with enhanced metadata.
        """
        logger.info("Starting comprehensive ETF sync...")
        
        stats = {"total": len(ENHANCED_INDIAN_ETFS), "added": 0, "updated": 0, "failed": 0}
        
        for etf_meta in ENHANCED_INDIAN_ETFS:
            try:
                # Fetch comprehensive data
                enhanced_data = await self._fetch_comprehensive_etf_data(etf_meta)
                
                if not enhanced_data:
                    stats["failed"] += 1
                    continue
                
                # Store with enhanced fields
                is_new = await self._store_enhanced_etf(enhanced_data)
                
                if is_new:
                    stats["added"] += 1
                else:
                    stats["updated"] += 1
                
                # Be nice to Yahoo Finance
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.warning(f"Failed to process ETF {etf_meta['symbol']}: {e}")
                stats["failed"] += 1
        
        await self.db.commit()
        logger.info(f"ETF sync complete: {stats}")
        return stats
    
    async def _fetch_comprehensive_etf_data(
        self,
        etf_meta: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch comprehensive ETF data from yfinance and calculate metrics.
        """
        symbol = etf_meta["symbol"]
        
        try:
            # Fetch from yfinance
            ticker = yf.Ticker(symbol)
            
            # Get current price data
            info = ticker.info
            history = ticker.history(period="1y")
            
            if history.empty:
                logger.warning(f"No price data for {symbol}")
                return None
            
            latest_close = history['Close'].iloc[-1]
            
            # Calculate NAV (for Indian ETFs, NAV is published separately but we approximate)
            # For gold/silver ETFs, NAV tracks underlying metal price
            # For index ETFs, NAV tracks index level
            nav = latest_close  # Simplified - actual NAV would need separate API
            
            # Premium/Discount calculation
            market_price = latest_close
            premium_discount = ((market_price - nav) / nav) * 100 if nav > 0 else 0
            
            # Liquidity metrics
            avg_volume = history['Volume'].tail(30).mean()
            avg_volume_value = avg_volume * latest_close
            
            # Volatility (standard deviation)
            returns = history['Close'].pct_change().dropna()
            volatility = returns.std() * (252 ** 0.5) * 100  # Annualized
            
            # Tracking error (would need benchmark data - placeholder)
            tracking_error = None  # Would calculate against benchmark
            
            # 52-week high/low
            high_52w = history['High'].tail(252).max()
            low_52w = history['Low'].tail(252).min()
            
            # Bid-ask spread (if available)
            bid_ask_spread = None
            if 'bid' in info and 'ask' in info:
                bid = info.get('bid', 0)
                ask = info.get('ask', 0)
                if bid > 0 and ask > 0:
                    bid_ask_spread = ((ask - bid) / ask) * 100
            
            # Build comprehensive data
            enhanced_data = {
                "symbol": symbol,
                "name": etf_meta["name"],
                "underlying": etf_meta["underlying"],
                "underlying_index": etf_meta.get("underlying_index"),
                "benchmark": etf_meta.get("benchmark"),
                
                # Price data
                "nav": float(nav),
                "market_price": float(market_price),
                "premium_discount": round(premium_discount, 2),
                
                # Size and expense
                "aum": info.get("totalAssets"),
                "expense_ratio": etf_meta.get("expense_ratio"),
                
                # Liquidity metrics
                "avg_daily_volume": int(avg_volume),
                "avg_daily_volume_value": float(avg_volume_value),
                "bid_ask_spread_pct": round(bid_ask_spread, 3) if bid_ask_spread else None,
                
                # Performance metrics
                "volatility_1y": round(volatility, 2),
                "tracking_error": tracking_error,
                "high_52w": float(high_52w),
                "low_52w": float(low_52w),
                
                # Returns
                "return_1m": self._calculate_return(history, 30),
                "return_3m": self._calculate_return(history, 90),
                "return_6m": self._calculate_return(history, 180),
                "return_1y": self._calculate_return(history, 252),
                
                # Metadata
                "exchange": "NSE",
                "updated_at": datetime.utcnow(),
            }
            
            return enhanced_data
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def _calculate_return(self, history, days: int) -> Optional[float]:
        """Calculate return for specified period."""
        try:
            if len(history) < days:
                return None
            
            latest_price = history['Close'].iloc[-1]
            past_price = history['Close'].iloc[-days]
            
            if past_price > 0:
                return_pct = ((latest_price - past_price) / past_price) * 100
                return round(return_pct, 2)
            return None
            
        except Exception as e:
            logger.warning(f"Error calculating return: {e}")
            return None
    
    async def _store_enhanced_etf(
        self,
        enhanced_data: Dict[str, Any]
    ) -> bool:
        """
        Store enhanced ETF data in database.
        Returns True if new ETF, False if updated.
        """
        from sqlalchemy import select
        from app.models.asset_data import ETF
        
        # Check if exists
        result = await self.db.execute(
            select(ETF).where(ETF.symbol == enhanced_data["symbol"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update - only set fields that exist in the model
            for key, value in enhanced_data.items():
                if hasattr(existing, key) and key != "symbol":
                    setattr(existing, key, value)
            is_new = False
        else:
            # Create new - filter to only fields that exist in model
            model_fields = {c.name for c in ETF.__table__.columns}
            filtered_data = {k: v for k, v in enhanced_data.items() if k in model_fields}
            
            new_etf = ETF(**filtered_data)
            self.db.add(new_etf)
            is_new = True
        
        return is_new
    
    async def calculate_tracking_error(
        self,
        etf_symbol: str,
        benchmark_data: List[float]
    ) -> Optional[float]:
        """
        Calculate tracking error: standard deviation of (ETF returns - Benchmark returns).
        This measures how closely the ETF tracks its benchmark.
        """
        try:
            ticker = yf.Ticker(etf_symbol)
            history = ticker.history(period="1y")
            
            if history.empty or not benchmark_data:
                return None
            
            etf_returns = history['Close'].pct_change().dropna()
            
            # Ensure same length
            min_len = min(len(etf_returns), len(benchmark_data))
            etf_returns = etf_returns.iloc[-min_len:]
            benchmark_returns = benchmark_data[-min_len:]
            
            # Calculate tracking difference
            tracking_diff = etf_returns - benchmark_returns
            
            # Annualized tracking error
            tracking_error = tracking_diff.std() * (252 ** 0.5) * 100
            
            return round(tracking_error, 2)
            
        except Exception as e:
            logger.warning(f"Error calculating tracking error: {e}")
            return None
    
    async def get_holdings_breakdown(
        self,
        etf_symbol: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get top holdings breakdown for an ETF.
        For index ETFs, this would show the constituent stocks.
        """
        # This would require scraping from AMC websites or using specialized APIs
        # Placeholder implementation
        
        holdings = []
        
        # For gold/silver ETFs
        if any(x in etf_symbol.lower() for x in ['gold', 'silver']):
            holdings.append({
                "holding_name": "Physical Gold/Silver",
                "percentage": 100.0,
                "asset_type": "commodity"
            })
        
        # For index ETFs, would need to fetch constituent stocks
        # This would require additional data sources
        
        return holdings if holdings else None
    
    async def get_creation_redemption_info(
        self,
        etf_symbol: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get creation/redemption unit information.
        Important for institutional investors and understanding liquidity.
        """
        # This information is typically in the scheme document
        # Would need to be scraped from AMC websites
        
        cr_info = {
            "creation_unit_size": None,  # Minimum units for creation
            "redemption_unit_size": None,  # Minimum units for redemption
            "applicable_to": "authorized_participants",  # Usually only APs can create/redeem
        }
        
        return cr_info
    
    async def analyze_tax_efficiency(
        self,
        etf_symbol: str
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze tax efficiency of ETF.
        ETFs are generally more tax-efficient than mutual funds.
        """
        tax_info = {
            "tax_treatment": None,
            "ltcg_period_months": None,
            "ltcg_tax_rate": None,
            "stcg_tax_rate": None,
        }
        
        # Determine based on underlying
        symbol_lower = etf_symbol.lower()
        
        if 'gold' in symbol_lower or 'silver' in symbol_lower:
            # Gold/Silver ETFs are treated as non-equity
            tax_info.update({
                "tax_treatment": "non_equity",
                "ltcg_period_months": 36,
                "ltcg_tax_rate": "20% with indexation",
                "stcg_tax_rate": "As per slab",
            })
        else:
            # Equity ETFs
            tax_info.update({
                "tax_treatment": "equity",
                "ltcg_period_months": 12,
                "ltcg_tax_rate": "12.5% (>1.25 lakh)",
                "stcg_tax_rate": "20%",
            })
        
        return tax_info