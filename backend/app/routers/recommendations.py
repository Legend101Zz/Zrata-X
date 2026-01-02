"""
AI-powered investment recommendations API.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.asset_data import (ETF, FixedDepositRate, MacroIndicator,
                                   MutualFund)
from app.models.user import (InvestmentPlan, PortfolioHolding, RiskTolerance,
                             User)
from app.services.ai_engine.openrouter_client import OpenRouterClient
from app.services.memory.supermemory_service import SupermemoryService
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/recommend", tags=["Recommendations"])


class InvestmentInput(BaseModel):
    amount: float = Field(..., gt=0, le=10000000)
    risk_override: Optional[str] = None
    avoid_lock_ins: bool = False
    prefer_tax_saving: bool = False
    include_fds: bool = True
    include_gold: bool = True


class SuggestionItem(BaseModel):
    asset_type: str
    instrument_name: str
    instrument_id: str
    amount: float
    percentage: float
    reason: str
    highlight: Optional[str] = None
    current_rate: Optional[float] = None


class RecommendationResponse(BaseModel):
    id: int
    suggestions: List[SuggestionItem]
    summary: str
    risk_note: str
    tax_note: Optional[str]
    market_context: dict
    valid_until: datetime


class GuestInvestmentInput(BaseModel):
    """Simplified input for guest users without portfolio context."""
    amount: float = Field(..., gt=0, le=10000000)
    risk_profile: Optional[str] = "moderate"  # conservative, moderate, aggressive
    avoid_lock_ins: bool = False
    prefer_tax_saving: bool = False
    include_fds: bool = True
    include_gold: bool = True


class GuestRecommendationResponse(BaseModel):
    """Simplified response for guests - no persistence."""
    suggestions: List[SuggestionItem]
    summary: str
    risk_note: str
    tax_note: Optional[str] = None
    market_context: dict
    disclaimer: str
    generated_at: datetime

@router.post("/invest", response_model=RecommendationResponse)
async def get_investment_recommendation(
    user_id: int,
    request: InvestmentInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Get AI-powered investment recommendation for a given amount.
    No hardcoded allocation rules - fully dynamic.
    """
    # Get user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current portfolio
    holdings_result = await db.execute(
        select(PortfolioHolding).where(PortfolioHolding.user_id == user_id)
    )
    holdings = holdings_result.scalars().all()
    
    current_portfolio = [
        {
            "asset_type": h.asset_type,
            "name": h.asset_name,
            "invested": h.invested_amount,
            "current_value": h.current_value
        }
        for h in holdings
    ]
    
    # Get available options
    available_options = await _get_available_options(db, request)
    
    # Get market data
    market_data = await _get_market_snapshot(db)
    
    # Get user context from memory
    memory_service = SupermemoryService()
    user_context = await memory_service.get_user_context(str(user_id))
    
    # Build preferences
    risk = request.risk_override or user.risk_tolerance.value
    preferences = {
        "risk_tolerance": risk,
        "horizon_years": user.investment_horizon_years,
        "avoid_lock_ins": request.avoid_lock_ins,
        "prefer_tax_saving": request.prefer_tax_saving,
        "user_history": user_context,
        **(user.preferences or {})
    }
    
    # Get AI recommendation
    ai_client = OpenRouterClient()
    recommendation = await ai_client.generate_investment_suggestion(
        investment_amount=request.amount,
        current_portfolio=current_portfolio,
        market_data=market_data,
        user_preferences=preferences,
        available_options=available_options
    )
    
    # Store the plan
    plan = InvestmentPlan(
        user_id=user_id,
        investment_amount=request.amount,
        risk_level_used=risk,
        recommendations=recommendation.get("suggestions", []),
        market_analysis=market_data,
        reasoning=recommendation.get("summary", ""),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    
    # Convert AI response to structured format
    suggestions = []
    for s in recommendation.get("suggestions", []):
        suggestions.append(SuggestionItem(
            asset_type=s.get("asset_type", "unknown"),
            instrument_name=s.get("instrument", ""),
            instrument_id=s.get("instrument_id", ""),
            amount=s.get("amount", 0),
            percentage=s.get("percentage", 0),
            reason=s.get("reason", ""),
            highlight=s.get("highlight"),
            current_rate=s.get("current_rate")
        ))
    
    return RecommendationResponse(
        id=plan.id,
        suggestions=suggestions,
        summary=recommendation.get("summary", ""),
        risk_note=recommendation.get("risk_note", ""),
        tax_note=recommendation.get("tax_note"),
        market_context=market_data,
        valid_until=plan.expires_at
    )


async def _get_available_options(
    db: AsyncSession,
    request: InvestmentInput
) -> dict:
    """Get available investment options dynamically."""
    options = {}
    
    # Top mutual funds by category
    mf_result = await db.execute(
        select(MutualFund)
        .where(MutualFund.plan_type == "direct")
        .order_by(MutualFund.return_1y.desc().nullslast())
        .limit(50)
    )
    mutual_funds = mf_result.scalars().all()
    options["mutual_funds"] = [
        {
            "scheme_code": mf.scheme_code,
            "name": mf.scheme_name,
            "category": mf.category,
            "return_1y": mf.return_1y,
            "nav": mf.nav
        }
        for mf in mutual_funds
    ]
    
    # Best FD rates if included
    if request.include_fds:
        fd_result = await db.execute(
            select(FixedDepositRate)
            .order_by(FixedDepositRate.interest_rate_general.desc())
            .limit(20)
        )
        fds = fd_result.scalars().all()
        options["fixed_deposits"] = [
            {
                "bank": fd.bank_name,
                "bank_type": fd.bank_type,
                "tenure": fd.tenure_display,
                "rate_general": fd.interest_rate_general,
                "rate_senior": fd.interest_rate_senior,
                "has_credit_card": fd.has_credit_card_offer
            }
            for fd in fds
        ]
    
    # Gold/Silver options if included
    if request.include_gold:
        etf_result = await db.execute(
            select(ETF).where(ETF.underlying.in_(["gold", "silver"]))
        )
        etfs = etf_result.scalars().all()
        options["gold_silver_etfs"] = [
            {
                "symbol": etf.symbol,
                "name": etf.name,
                "underlying": etf.underlying,
                "nav": etf.nav,
                "expense_ratio": etf.expense_ratio
            }
            for etf in etfs
        ]
    
    return options


async def _get_market_snapshot(db: AsyncSession) -> dict:
    """Get current market conditions."""
    indicators_result = await db.execute(
        select(MacroIndicator).order_by(MacroIndicator.recorded_at.desc())
    )
    indicators = indicators_result.scalars().all()
    
    snapshot = {}
    for ind in indicators:
        if ind.indicator_name not in snapshot:
            snapshot[ind.indicator_name] = {
                "value": ind.value,
                "previous": ind.previous_value,
                "change": ind.change_percent,
                "unit": ind.unit
            }
    
    return snapshot


@router.post("/backtest")
async def backtest_strategy(
    user_id: int,
    strategy: dict,
    years: int = 5,
    db: AsyncSession = Depends(get_db)
):
    """
    Backtest a strategy against historical data.
    Shows "what if I had done this X years ago".
    """
    ai_client = OpenRouterClient()
    
    prompt = f"""
    Simulate the performance of this investment strategy over the past {years} years
    using Indian market data:
    
    Strategy:
    {strategy}
    
    Consider:
    - Actual historical returns of Indian mutual funds, gold, FDs
    - Inflation impact
    - Tax implications
    - Market volatility periods
    
    Return a JSON with:
    - projected_value: estimated current value
    - cagr: compound annual growth rate
    - max_drawdown: worst peak-to-trough decline
    - volatility: standard deviation of returns
    - comparison: how this compared to simple FD or Nifty 50
    - yearly_breakdown: year by year performance
    """
    
    response = await ai_client.complete(
        prompt=prompt,
        response_format={"type": "json_object"}
    )
    
    import json
    return json.loads(response)

@router.post("/invest/guest", response_model=GuestRecommendationResponse)
async def get_guest_recommendation(
    request: GuestInvestmentInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Get investment recommendation for guest users.
    No user context or portfolio - purely market-based suggestions.
    """
    # Get available options
    available_options = await _get_available_options_guest(db, request)
    
    # Get market data
    market_data = await _get_market_snapshot(db)
    
    # Build basic preferences
    preferences = {
        "risk_tolerance": request.risk_profile,
        "horizon_years": 5,  # Default assumption for guests
        "avoid_lock_ins": request.avoid_lock_ins,
        "prefer_tax_saving": request.prefer_tax_saving,
    }
    
    # Get AI recommendation (no portfolio context for guests)
    ai_client = OpenRouterClient()
    recommendation = await ai_client.generate_investment_suggestion(
        investment_amount=request.amount,
        current_portfolio=[],  # Empty for guests
        market_data=market_data,
        user_preferences=preferences,
        available_options=available_options
    )
    
    # Convert AI response to structured format
    suggestions = []
    for s in recommendation.get("suggestions", []):
        suggestions.append(SuggestionItem(
            asset_type=s.get("asset_type", "unknown"),
            instrument_name=s.get("instrument", ""),
            instrument_id=s.get("instrument_id", ""),
            amount=s.get("amount", 0),
            percentage=s.get("percentage", 0),
            reason=s.get("reason", ""),
            highlight=s.get("highlight"),
            current_rate=s.get("current_rate")
        ))
    
    return GuestRecommendationResponse(
        suggestions=suggestions,
        summary=recommendation.get("summary", ""),
        risk_note=recommendation.get("risk_note", ""),
        tax_note=recommendation.get("tax_note"),
        market_context=market_data,
        disclaimer="This is educational information based on current market data. Not personalized investment advice. Sign in to get portfolio-aware recommendations.",
        generated_at=datetime.utcnow()
    )


async def _get_available_options_guest(
    db: AsyncSession,
    request: GuestInvestmentInput
) -> dict:
    """Get available investment options for guest users."""
    options = {}
    
    # Top mutual funds by category
    mf_result = await db.execute(
        select(MutualFund)
        .where(MutualFund.plan_type == "direct")
        .order_by(MutualFund.return_1y.desc().nullslast())
        .limit(30)
    )
    mutual_funds = mf_result.scalars().all()
    options["mutual_funds"] = [
        {
            "scheme_code": mf.scheme_code,
            "name": mf.scheme_name,
            "category": mf.category,
            "return_1y": mf.return_1y,
            "nav": mf.nav
        }
        for mf in mutual_funds
    ]
    
    # Best FD rates if included
    if request.include_fds:
        fd_result = await db.execute(
            select(FixedDepositRate)
            .order_by(FixedDepositRate.interest_rate_general.desc())
            .limit(15)
        )
        fds = fd_result.scalars().all()
        options["fixed_deposits"] = [
            {
                "bank": fd.bank_name,
                "bank_type": fd.bank_type,
                "tenure": fd.tenure_display,
                "rate_general": fd.interest_rate_general,
                "rate_senior": fd.interest_rate_senior,
            }
            for fd in fds
        ]
    
    # Gold/Silver options if included
    if request.include_gold:
        etf_result = await db.execute(
            select(ETF).where(ETF.underlying.in_(["gold", "silver"]))
        )
        etfs = etf_result.scalars().all()
        options["gold_silver_etfs"] = [
            {
                "symbol": etf.symbol,
                "name": etf.name,
                "underlying": etf.underlying,
                "nav": etf.nav,
                "expense_ratio": etf.expense_ratio
            }
            for etf in etfs
        ]
    
    return options