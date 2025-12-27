"""
Market data services package.
"""
from .gold_price_service import GoldPriceService
from .macro_data_service import MacroDataService
from .market_data_aggregator import MarketDataAggregator
from .news_service import NewsService

__all__ = [
    "MarketDataAggregator",
    "GoldPriceService", 
    "MacroDataService",
    "NewsService"
]