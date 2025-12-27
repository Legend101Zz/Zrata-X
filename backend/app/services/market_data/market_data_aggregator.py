"""
Aggregates market data from multiple sources for AI analysis.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.models.asset_data import (FixedDepositRate, GoldSilverPrice,
                                   MacroIndicator, MarketNews, MutualFund)
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class MarketDataAggregator:
    """
    Aggregates all market data into a single snapshot for AI consumption.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_current_market_snapshot(self) -> Dict[str, Any]:
        """
        Get comprehensive market snapshot for AI analysis.
        Returns all relevant data points needed for investment decisions.
        """
        snapshot = {}
        
        # Get macro indicators
        macro_data = await self._get_latest_macro_indicators()
        snapshot.update(macro_data)
        
        # Get gold/silver prices
        metal_prices = await self._get_latest_metal_prices()
        snapshot.update(metal_prices)
        
        # Get best FD rates summary
        fd_summary = await self._get_fd_rate_summary()
        snapshot["fd_rates"] = fd_summary
        
        # Get market sentiment from news
        sentiment = await self._get_market_sentiment()
        snapshot["market_sentiment"] = sentiment
        
        # Get equity market indicators
        equity_data = await self._get_equity_indicators()
        snapshot.update(equity_data)
        
        snapshot["snapshot_time"] = datetime.utcnow().isoformat()
        
        return snapshot
    
    async def _get_latest_macro_indicators(self) -> Dict[str, Any]:
        """Get latest macro economic indicators."""
        indicators = {}
        
        # Get distinct latest indicators
        result = await self.db.execute(
            select(MacroIndicator)
            .order_by(desc(MacroIndicator.recorded_at))
            .limit(20)
        )
        
        for indicator in result.scalars().all():
            if indicator.indicator_name not in indicators:
                indicators[indicator.indicator_name] = {
                    "value": indicator.value,
                    "previous": indicator.previous_value,
                    "change_percent": indicator.change_percent,
                    "unit": indicator.unit
                }
        
        return {
            "repo_rate": indicators.get("repo_rate", {}).get("value"),
            "inflation_cpi": indicators.get("cpi_inflation", {}).get("value"),
            "gdp_growth": indicators.get("gdp_growth", {}).get("value"),
            "usd_inr": indicators.get("usd_inr", {}).get("value"),
            "macro_indicators": indicators
        }
    
    async def _get_latest_metal_prices(self) -> Dict[str, Any]:
        """Get latest gold and silver prices."""
        result = await self.db.execute(
            select(GoldSilverPrice)
            .order_by(desc(GoldSilverPrice.recorded_at))
            .limit(10)
        )
        prices = result.scalars().all()
        
        gold_price = next((p for p in prices if p.metal_type == "gold"), None)
        silver_price = next((p for p in prices if p.metal_type == "silver"), None)
        
        # Calculate recent change
        week_ago = datetime.utcnow() - timedelta(days=7)
        result_historical = await self.db.execute(
            select(GoldSilverPrice)
            .where(GoldSilverPrice.recorded_at <= week_ago)
            .order_by(desc(GoldSilverPrice.recorded_at))
            .limit(10)
        )
        historical = result_historical.scalars().all()
        
        gold_week_ago = next((p for p in historical if p.metal_type == "gold"), None)
        silver_week_ago = next((p for p in historical if p.metal_type == "silver"), None)
        
        return {
            "gold_price_per_gram": gold_price.price_per_gram if gold_price else None,
            "gold_price_per_10g": gold_price.price_per_10g if gold_price else None,
            "gold_weekly_change_percent": (
                ((gold_price.price_per_gram - gold_week_ago.price_per_gram) / gold_week_ago.price_per_gram * 100)
                if gold_price and gold_week_ago else None
            ),
            "silver_price_per_gram": silver_price.price_per_gram if silver_price else None,
            "silver_weekly_change_percent": (
                ((silver_price.price_per_gram - silver_week_ago.price_per_gram) / silver_week_ago.price_per_gram * 100)
                if silver_price and silver_week_ago else None
            ),
        }
    
    async def _get_fd_rate_summary(self) -> Dict[str, Any]:
        """Get summary of best FD rates available."""
        result = await self.db.execute(
            select(FixedDepositRate)
            .order_by(desc(FixedDepositRate.interest_rate_general))
            .limit(50)
        )
        fd_rates = result.scalars().all()
        
        if not fd_rates:
            return {"best_rate": None, "average_rate": None}
        
        # Group by tenure
        short_term = [f for f in fd_rates if f.tenure_max_days and f.tenure_max_days <= 365]
        medium_term = [f for f in fd_rates if f.tenure_max_days and 365 < f.tenure_max_days <= 730]
        long_term = [f for f in fd_rates if f.tenure_max_days and f.tenure_max_days > 730]
        
        return {
            "best_overall_rate": fd_rates[0].interest_rate_general if fd_rates else None,
            "best_overall_bank": fd_rates[0].bank_name if fd_rates else None,
            "short_term_best": {
                "rate": short_term[0].interest_rate_general if short_term else None,
                "bank": short_term[0].bank_name if short_term else None,
                "tenure": short_term[0].tenure_display if short_term else None
            },
            "medium_term_best": {
                "rate": medium_term[0].interest_rate_general if medium_term else None,
                "bank": medium_term[0].bank_name if medium_term else None,
                "tenure": medium_term[0].tenure_display if medium_term else None
            },
            "long_term_best": {
                "rate": long_term[0].interest_rate_general if long_term else None,
                "bank": long_term[0].bank_name if long_term else None,
                "tenure": long_term[0].tenure_display if long_term else None
            },
            "with_credit_card_offer": [
                {"bank": f.bank_name, "rate": f.interest_rate_general}
                for f in fd_rates if f.has_credit_card_offer
            ][:5]
        }
    
    async def _get_market_sentiment(self) -> Dict[str, Any]:
        """Analyze recent news for market sentiment."""
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        result = await self.db.execute(
            select(MarketNews)
            .where(MarketNews.published_at >= week_ago)
            .where(MarketNews.sentiment_score.isnot(None))
        )
        news = result.scalars().all()
        
        if not news:
            return {"overall": "neutral", "score": 0, "news_count": 0}
        
        avg_sentiment = sum(n.sentiment_score for n in news) / len(news)
        
        # Categorize sentiment
        if avg_sentiment > 0.3:
            sentiment_label = "bullish"
        elif avg_sentiment < -0.3:
            sentiment_label = "bearish"
        else:
            sentiment_label = "neutral"
        
        # Category-wise sentiment
        category_sentiment = {}
        for n in news:
            for cat in (n.categories or []):
                if cat not in category_sentiment:
                    category_sentiment[cat] = []
                category_sentiment[cat].append(n.sentiment_score)
        
        for cat in category_sentiment:
            scores = category_sentiment[cat]
            category_sentiment[cat] = sum(scores) / len(scores)
        
        return {
            "overall": sentiment_label,
            "score": round(avg_sentiment, 2),
            "news_count": len(news),
            "by_category": category_sentiment
        }
    
    async def _get_equity_indicators(self) -> Dict[str, Any]:
        """Get equity market indicators."""
        # This would typically come from a market data API
        # For now, we'll check if we have any stored indicators
        
        result = await self.db.execute(
            select(MacroIndicator)
            .where(MacroIndicator.indicator_name.in_([
                "nifty50_pe", "nifty50_value", "sensex_value"
            ]))
            .order_by(desc(MacroIndicator.recorded_at))
        )
        
        indicators = {}
        for ind in result.scalars().all():
            if ind.indicator_name not in indicators:
                indicators[ind.indicator_name] = ind.value
        
        # Determine if market is overvalued
        nifty_pe = indicators.get("nifty50_pe")
        market_valuation = None
        if nifty_pe:
            if nifty_pe > 25:
                market_valuation = "overvalued"
            elif nifty_pe < 18:
                market_valuation = "undervalued"
            else:
                market_valuation = "fair"
        
        return {
            "nifty50_pe_ratio": nifty_pe,
            "nifty50_value": indicators.get("nifty50_value"),
            "market_valuation": market_valuation
        }
    
    async def get_asset_comparison(self, amount: float, horizon_years: int) -> Dict[str, Any]:
        """
        Compare projected returns across asset classes.
        Used for "what if" scenarios.
        """
        snapshot = await self.get_current_market_snapshot()
        
        # Simple projections (not financial advice)
        fd_rate = snapshot.get("fd_rates", {}).get("best_overall_rate", 7.5)
        
        comparisons = {
            "fixed_deposit": {
                "projected_value": amount * ((1 + fd_rate/100) ** horizon_years),
                "rate_used": fd_rate,
                "risk": "very_low",
                "liquidity": "low"
            },
            "debt_fund": {
                "projected_value": amount * ((1 + 7/100) ** horizon_years),  # Assume 7%
                "rate_used": 7.0,
                "risk": "low",
                "liquidity": "high",
                "tax_efficient": True
            },
            "gold": {
                "projected_value": amount * ((1 + 8/100) ** horizon_years),  # Historical ~8%
                "rate_used": 8.0,
                "risk": "medium",
                "liquidity": "high",
                "inflation_hedge": True
            },
            "equity_index": {
                "projected_value": amount * ((1 + 12/100) ** horizon_years),  # Historical ~12%
                "rate_used": 12.0,
                "risk": "high",
                "liquidity": "high"
            }
        }
        
        return comparisons