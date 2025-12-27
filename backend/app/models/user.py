"""
User and portfolio models.
"""
import enum

from app.database import Base
from sqlalchemy import (JSON, Boolean, Column, DateTime, Enum, Float,
                        ForeignKey, Integer, String, Text)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class RiskTolerance(str, enum.Enum):
    """User's self-declared risk tolerance."""
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class User(Base):
    """User account."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(200))
    
    # Investment preferences (not hardcoded allocations - just user preferences)
    risk_tolerance = Column(Enum(RiskTolerance), default=RiskTolerance.MODERATE)
    investment_horizon_years = Column(Integer, default=5)
    monthly_investment_capacity = Column(Float, nullable=True)
    
    # Preferences stored as flexible JSON
    preferences = Column(JSON, default=dict)  
    # Example: {"avoid_lock_ins": true, "prefer_tax_saving": false, "prefer_direct_plans": true}
    
    # Memory reference (Supermemory user ID)
    supermemory_user_id = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    holdings = relationship("PortfolioHolding", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    investment_plans = relationship("InvestmentPlan", back_populates="user")


class PortfolioHolding(Base):
    """Current portfolio holdings."""
    __tablename__ = "portfolio_holdings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Asset identification (flexible - works for any asset type)
    asset_type = Column(String(50))  # mutual_fund, etf, fd, gold, etc.
    asset_identifier = Column(String(100))  # scheme_code, symbol, bank_name, etc.
    asset_name = Column(String(500))
    
    # Holdings
    units = Column(Float, nullable=True)  # For MFs, ETFs
    invested_amount = Column(Float)
    current_value = Column(Float)
    average_cost = Column(Float, nullable=True)
    
    # For FDs
    maturity_date = Column(DateTime, nullable=True)
    interest_rate = Column(Float, nullable=True)
    
    # Metadata
    purchase_date = Column(DateTime)
    last_valued_at = Column(DateTime)
    notes = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="holdings")


class Transaction(Base):
    """Investment transaction history."""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    transaction_type = Column(String(20))  # buy, sell, dividend, interest
    asset_type = Column(String(50))
    asset_identifier = Column(String(100))
    asset_name = Column(String(500))
    
    units = Column(Float, nullable=True)
    amount = Column(Float)
    price_per_unit = Column(Float, nullable=True)
    
    transaction_date = Column(DateTime)
    notes = Column(Text, nullable=True)
    
    # Link to AI recommendation if applicable
    recommendation_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="transactions")


class InvestmentPlan(Base):
    """AI-generated investment recommendations."""
    __tablename__ = "investment_plans"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    investment_amount = Column(Float)
    risk_level_used = Column(String(50))
    
    # The AI-generated allocation (dynamic, not from hardcoded rules)
    recommendations = Column(JSON)
    # Example: [{"asset_type": "mutual_fund", "scheme_code": "...", "amount": 15000, "reason": "..."}]
    
    # AI analysis results
    market_analysis = Column(JSON)  # Macro conditions considered
    reasoning = Column(Text)  # Plain English explanation
    
    # Status
    status = Column(String(20), default="pending")  # pending, partial, completed, expired
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime)  # Recommendations valid for limited time
    
    user = relationship("User", back_populates="investment_plans")