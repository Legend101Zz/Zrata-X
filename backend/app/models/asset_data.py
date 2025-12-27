"""
Database models for storing dynamic asset data.
No hardcoded values - everything is discovered and stored dynamically.
"""
import enum

from app.database import Base
from sqlalchemy import (JSON, Boolean, Column, DateTime, Enum, Float,
                        ForeignKey, Integer, String, Text)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class AssetType(str, enum.Enum):
    MUTUAL_FUND = "mutual_fund"
    ETF = "etf"
    FIXED_DEPOSIT = "fixed_deposit"
    BOND = "bond"
    GOLD = "gold"
    SILVER = "silver"
    DIGITAL_GOLD = "digital_gold"


class MutualFund(Base):
    """Dynamically discovered mutual fund schemes."""
    __tablename__ = "mutual_funds"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_code = Column(String(20), unique=True, index=True)
    scheme_name = Column(String(500), index=True)
    isin_growth = Column(String(20), nullable=True)
    isin_div_payout = Column(String(20), nullable=True)
    amc_name = Column(String(200))
    category = Column(String(100))  # equity, debt, hybrid, etc.
    sub_category = Column(String(100), nullable=True)  # large cap, flexi cap, etc.
    plan_type = Column(String(20))  # direct, regular
    nav = Column(Float)
    nav_date = Column(DateTime)
    aum = Column(Float, nullable=True)  # Assets Under Management
    expense_ratio = Column(Float, nullable=True)
    risk_rating = Column(String(50), nullable=True)  # discovered from source
    
    # Performance (dynamically calculated)
    return_1m = Column(Float, nullable=True)
    return_3m = Column(Float, nullable=True)
    return_6m = Column(Float, nullable=True)
    return_1y = Column(Float, nullable=True)
    return_3y = Column(Float, nullable=True)
    return_5y = Column(Float, nullable=True)
    
    # Metadata
    source_url = Column(String(500), nullable=True)
    raw_data = Column(JSON, nullable=True)  # Store original scraped data
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)


class FixedDepositRate(Base):
    """Dynamically scraped FD rates from various banks."""
    __tablename__ = "fd_rates"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_name = Column(String(200), index=True)
    bank_type = Column(String(50))  # small_finance, private, public, nbfc
    tenure_min_days = Column(Integer)
    tenure_max_days = Column(Integer)
    tenure_display = Column(String(100))  # "1 year", "18 months", etc.
    interest_rate_general = Column(Float)
    interest_rate_senior = Column(Float, nullable=True)
    interest_rate_women = Column(Float, nullable=True)  # Some banks offer this
    min_amount = Column(Float, nullable=True)
    max_amount = Column(Float, nullable=True)
    special_features = Column(JSON, nullable=True)  # credit card, premature withdrawal, etc.
    source_url = Column(String(500))
    scraped_at = Column(DateTime, server_default=func.now())
    is_verified = Column(Boolean, default=False)
    
    # Additional benefits (dynamically discovered)
    has_credit_card_offer = Column(Boolean, default=False)
    credit_card_details = Column(JSON, nullable=True)


class GoldSilverPrice(Base):
    """Gold and silver price history."""
    __tablename__ = "gold_silver_prices"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metal_type = Column(String(20), index=True)  # gold, silver
    price_per_gram = Column(Float)
    price_per_10g = Column(Float)
    price_per_oz = Column(Float, nullable=True)
    currency = Column(String(10), default="INR")
    source = Column(String(100))
    recorded_at = Column(DateTime, server_default=func.now())


class DigitalGoldProvider(Base):
    """Digital gold platforms discovered dynamically."""
    __tablename__ = "digital_gold_providers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_name = Column(String(200), unique=True)
    buy_price = Column(Float)
    sell_price = Column(Float)
    spread_percent = Column(Float)
    min_investment = Column(Float)
    gst_percent = Column(Float, default=3.0)
    storage_fee_percent = Column(Float, nullable=True)
    features = Column(JSON, nullable=True)
    website_url = Column(String(500))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ETF(Base):
    """Exchange Traded Funds."""
    __tablename__ = "etfs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(50), unique=True, index=True)
    name = Column(String(300))
    underlying = Column(String(100))  # gold, silver, nifty50, etc.
    nav = Column(Float)
    market_price = Column(Float)
    premium_discount = Column(Float)  # (market_price - nav) / nav * 100
    aum = Column(Float, nullable=True)
    expense_ratio = Column(Float, nullable=True)
    exchange = Column(String(10), default="NSE")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MacroIndicator(Base):
    """Macro economic indicators for AI analysis."""
    __tablename__ = "macro_indicators"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    indicator_name = Column(String(100), index=True)  # repo_rate, inflation, etc.
    value = Column(Float)
    previous_value = Column(Float, nullable=True)
    change_percent = Column(Float, nullable=True)
    unit = Column(String(50))  # percent, basis_points, etc.
    source = Column(String(200))
    recorded_at = Column(DateTime, server_default=func.now())
    effective_date = Column(DateTime, nullable=True)


class MarketNews(Base):
    """Financial news for sentiment analysis."""
    __tablename__ = "market_news"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500))
    summary = Column(Text, nullable=True)
    source = Column(String(200))
    url = Column(String(500), unique=True)
    published_at = Column(DateTime)
    categories = Column(JSON)  # ["gold", "rbi", "inflation"]
    sentiment_score = Column(Float, nullable=True)  # -1 to 1
    relevance_score = Column(Float, nullable=True)
    scraped_at = Column(DateTime, server_default=func.now())


class DataSource(Base):
    """Track discovered data sources for dynamic scraping."""
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_type = Column(String(50))  # fd_rates, mf_nav, gold_price, news
    source_name = Column(String(200))
    source_url = Column(String(500), unique=True)
    scraper_config = Column(JSON)  # CSS selectors, patterns, etc.
    is_active = Column(Boolean, default=True)
    last_scraped = Column(DateTime, nullable=True)
    scrape_interval_seconds = Column(Integer, default=86400)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())