"""
Structured market signals — the bridge between raw data and recommendations.

Raw news/data → LLM processing → MarketSignal rows
The recommendation engine reads ONLY from this table, never raw articles.
"""
from app.database import Base
from sqlalchemy import (JSON, Boolean, Column, DateTime, Float, Index, Integer,
                        String, Text, UniqueConstraint)
from sqlalchemy.sql import func


class MarketSignal(Base):
    """
    A single structured market signal derived from one or more raw data points.
    
    Examples:
    - "RBI holds repo rate at 6.5%" → signal_name="rbi_rate_hold", direction="neutral"
    - "FII outflows ₹12,000cr" → signal_name="fii_outflow", direction="bearish"
    - "Gold crosses ₹7,500/gram" → signal_name="gold_price_surge", direction="bullish"
    
    The LLM creates these during batch processing.
    The recommendation pipeline reads these — never raw articles.
    """
    __tablename__ = "market_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # ── Identity ──
    signal_name = Column(String(200), index=True)          # e.g. "rbi_rate_hold"
    signal_category = Column(String(50), index=True)       # macro, equity, debt, gold, geopolitics, policy
    source_type = Column(String(50))                       # news, macro_data, price_change, fd_rate_change

    # ── Signal content ──
    direction = Column(String(20))                         # bullish, bearish, neutral
    strength = Column(String(20))                          # low, medium, high
    affected_asset_classes = Column(JSON)                   # ["equity", "gold", "debt", ...]
    reasoning = Column(Text)                               # 1-2 sentence LLM explanation
    raw_headline = Column(String(500), nullable=True)      # original headline, for traceability
    raw_source = Column(String(200), nullable=True)        # "moneycontrol", "rss:reuters", etc.

    # ── Metadata ──
    confidence = Column(Float, default=0.7)                # 0.0 - 1.0, how sure the LLM was
    expires_at = Column(DateTime, nullable=True)           # signals go stale — macro: 30d, news: 7d
    is_active = Column(Boolean, default=True, index=True)  # soft-expire old signals
    
    created_at = Column(DateTime, server_default=func.now())
    source_date = Column(DateTime, nullable=True)          # when the underlying event happened

    # ── Prevent exact duplicate signals ──
    __table_args__ = (
        Index("ix_signal_active_category", "is_active", "signal_category"),
        Index("ix_signal_active_created", "is_active", "created_at"),
    )