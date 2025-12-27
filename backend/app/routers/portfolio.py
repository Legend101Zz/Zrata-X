"""
Portfolio management API routes.
"""
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.user import PortfolioHolding, RiskTolerance, Transaction, User
from app.services.ai_engine.openrouter_client import OpenRouterClient
from app.services.data_scrapers.mf_data_service import MutualFundDataService
from app.services.memory.supermemory_service import SupermemoryService
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.asset_data import MutualFund

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


# Pydantic schemas
class HoldingCreate(BaseModel):
    asset_type: str
    asset_identifier: str
    asset_name: str
    invested_amount: float
    units: Optional[float] = None
    purchase_date: datetime
    interest_rate: Optional[float] = None  # For FDs
    maturity_date: Optional[datetime] = None
    notes: Optional[str] = None


class HoldingResponse(BaseModel):
    id: int
    asset_type: str
    asset_identifier: str
    asset_name: str
    invested_amount: float
    current_value: float
    units: Optional[float]
    gain_loss: float
    gain_loss_percent: float
    purchase_date: datetime
    
    class Config:
        from_attributes = True


class PortfolioSummary(BaseModel):
    total_invested: float
    total_current_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    allocation: dict  # By asset type


class InvestmentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to invest in INR")
    risk_override: Optional[RiskTolerance] = None
    preferences_override: Optional[dict] = None


@router.get("/holdings", response_model=List[HoldingResponse])
async def get_holdings(
    user_id: int,  # In production, get from auth
    db: AsyncSession = Depends(get_db)
):
    """Get all portfolio holdings for a user."""
    result = await db.execute(
        select(PortfolioHolding).where(PortfolioHolding.user_id == user_id)
    )
    holdings = result.scalars().all()
    
    # Calculate current values
    mf_service = MutualFundDataService(db)
    response = []
    
    for h in holdings:
        current_value = h.current_value
        
        # Update MF values
        if h.asset_type == "mutual_fund":
            mf = await db.execute(
                select(MutualFund).where(MutualFund.scheme_code == h.asset_identifier)
            )
            mf = mf.scalar_one_or_none()
            if mf and h.units:
                current_value = h.units * mf.nav
        
        gain_loss = current_value - h.invested_amount
        gain_loss_percent = (gain_loss / h.invested_amount * 100) if h.invested_amount > 0 else 0
        
        response.append(HoldingResponse(
            id=h.id,
            asset_type=h.asset_type,
            asset_identifier=h.asset_identifier,
            asset_name=h.asset_name,
            invested_amount=h.invested_amount,
            current_value=current_value,
            units=h.units,
            gain_loss=gain_loss,
            gain_loss_percent=gain_loss_percent,
            purchase_date=h.purchase_date
        ))
    
    return response


@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get portfolio summary with allocation breakdown."""
    holdings = await get_holdings(user_id, db)
    
    total_invested = sum(h.invested_amount for h in holdings)
    total_current = sum(h.current_value for h in holdings)
    
    # Calculate allocation by asset type
    allocation = {}
    for h in holdings:
        if h.asset_type not in allocation:
            allocation[h.asset_type] = {"invested": 0, "current": 0}
        allocation[h.asset_type]["invested"] += h.invested_amount
        allocation[h.asset_type]["current"] += h.current_value
    
    # Convert to percentages
    for asset_type in allocation:
        allocation[asset_type]["percent"] = (
            allocation[asset_type]["current"] / total_current * 100
            if total_current > 0 else 0
        )
    
    return PortfolioSummary(
        total_invested=total_invested,
        total_current_value=total_current,
        total_gain_loss=total_current - total_invested,
        total_gain_loss_percent=(total_current - total_invested) / total_invested * 100 if total_invested > 0 else 0,
        allocation=allocation
    )


@router.post("/holdings")
async def add_holding(
    user_id: int,
    holding: HoldingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a new portfolio holding."""
    db_holding = PortfolioHolding(
        user_id=user_id,
        asset_type=holding.asset_type,
        asset_identifier=holding.asset_identifier,
        asset_name=holding.asset_name,
        invested_amount=holding.invested_amount,
        current_value=holding.invested_amount,  # Initial value
        units=holding.units,
        average_cost=holding.invested_amount / holding.units if holding.units else None,
        purchase_date=holding.purchase_date,
        maturity_date=holding.maturity_date,
        interest_rate=holding.interest_rate,
        notes=holding.notes,
        last_valued_at=datetime.utcnow()
    )
    db.add(db_holding)
    
    # Also record as transaction
    transaction = Transaction(
        user_id=user_id,
        transaction_type="buy",
        asset_type=holding.asset_type,
        asset_identifier=holding.asset_identifier,
        asset_name=holding.asset_name,
        units=holding.units,
        amount=holding.invested_amount,
        price_per_unit=holding.invested_amount / holding.units if holding.units else None,
        transaction_date=holding.purchase_date
    )
    db.add(transaction)
    
    await db.commit()
    
    # Store in memory
    memory_service = SupermemoryService()
    await memory_service.store_investment_action(
        user_id=str(user_id),
        action_type="buy",
        details={
            "asset_name": holding.asset_name,
            "asset_type": holding.asset_type,
            "amount": holding.invested_amount,
            "date": holding.purchase_date.isoformat()
        }
    )
    
    return {"message": "Holding added successfully", "id": db_holding.id}


@router.post("/analyze")
async def analyze_portfolio(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get AI analysis of current portfolio."""
    # Get holdings
    holdings = await get_holdings(user_id, db)
    portfolio_data = [h.model_dump() for h in holdings]
    
    # Get user preferences
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get market data
    from app.services.market_data_aggregator import MarketDataAggregator
    market_service = MarketDataAggregator(db)
    market_data = await market_service.get_current_market_snapshot()
    
    # Get user context from memory
    memory_service = SupermemoryService()
    user_context = await memory_service.get_user_context(str(user_id))
    
    # AI analysis
    ai_client = OpenRouterClient()
    analysis = await ai_client.analyze_portfolio(
        portfolio=portfolio_data,
        market_data=market_data,
        user_preferences={
            "risk_tolerance": user.risk_tolerance.value,
            "horizon_years": user.investment_horizon_years,
            "preferences": user.preferences,
            "historical_context": user_context
        }
    )
    
    return analysis