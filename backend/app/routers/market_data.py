"""
Market data API routes - provides current market snapshot and historical data.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.asset_data import (ETF, DigitalGoldProvider, FixedDepositRate,
                                   GoldSilverPrice, MacroIndicator, MarketNews,
                                   MutualFund)
from app.services.data_scrapers.mf_data_service import MutualFundDataService
from app.services.market_data.market_data_aggregator import \
    MarketDataAggregator
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/market", tags=["Market Data"])


# Pydantic Schemas
class MarketSnapshot(BaseModel):
    repo_rate: Optional[float]
    inflation_rate: Optional[float]
    gold_price_per_gram: Optional[float]
    silver_price_per_gram: Optional[float]
    nifty_pe_ratio: Optional[float]
    market_sentiment: Optional[str]
    last_updated: datetime


class FDRateResponse(BaseModel):
    id: int
    bank_name: str
    bank_type: str
    tenure_display: str
    interest_rate_general: float
    interest_rate_senior: Optional[float]
    has_credit_card_offer: bool
    special_features: Optional[dict]

    class Config:
        from_attributes = True


class MutualFundResponse(BaseModel):
    scheme_code: str
    scheme_name: str
    amc_name: str
    category: str
    plan_type: str
    nav: float
    nav_date: Optional[datetime]
    return_1y: Optional[float]
    expense_ratio: Optional[float]

    class Config:
        from_attributes = True


class ETFResponse(BaseModel):
    symbol: str
    name: str
    underlying: str
    nav: float
    market_price: float
    premium_discount: float
    expense_ratio: Optional[float]

    class Config:
        from_attributes = True


class GoldPriceResponse(BaseModel):
    metal_type: str
    price_per_gram: float
    price_per_10g: float
    recorded_at: datetime

    class Config:
        from_attributes = True


class NewsResponse(BaseModel):
    id: int
    title: str
    summary: Optional[str]
    source: str
    url: str
    published_at: datetime
    sentiment_score: Optional[float]
    categories: List[str]

    class Config:
        from_attributes = True


class MacroIndicatorResponse(BaseModel):
    indicator_name: str
    value: float
    previous_value: Optional[float]
    change_percent: Optional[float]
    unit: str
    recorded_at: datetime

    class Config:
        from_attributes = True


# Routes
@router.get("/snapshot", response_model=MarketSnapshot)
async def get_market_snapshot(db: AsyncSession = Depends(get_db)):
    """Get current market snapshot with key indicators."""
    aggregator = MarketDataAggregator(db)
    snapshot = await aggregator.get_current_market_snapshot()
    return MarketSnapshot(**snapshot, last_updated=datetime.utcnow())


@router.get("/fd-rates", response_model=List[FDRateResponse])
async def get_fd_rates(
    bank_type: Optional[str] = Query(None, description="Filter by bank type: small_finance, private, public"),
    min_rate: Optional[float] = Query(None, ge=0, le=15),
    tenure_days: Optional[int] = Query(None, ge=7, le=3650),
    with_credit_card: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get best FD rates with filters."""
    query = select(FixedDepositRate).order_by(desc(FixedDepositRate.interest_rate_general))
    
    if bank_type:
        query = query.where(FixedDepositRate.bank_type == bank_type)
    if min_rate:
        query = query.where(FixedDepositRate.interest_rate_general >= min_rate)
    if tenure_days:
        query = query.where(
            FixedDepositRate.tenure_min_days <= tenure_days,
            FixedDepositRate.tenure_max_days >= tenure_days
        )
    if with_credit_card:
        query = query.where(FixedDepositRate.has_credit_card_offer == True)
    
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/mutual-funds", response_model=List[MutualFundResponse])
async def get_mutual_funds(
    search: Optional[str] = Query(None, min_length=2),
    category: Optional[str] = Query(None),
    amc: Optional[str] = Query(None),
    plan_type: str = Query("direct", pattern="^(direct|regular)$"),
    sort_by: str = Query("return_1y", pattern="^(nav|return_1y|return_3y|aum)$"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Search and filter mutual funds."""
    mf_service = MutualFundDataService(db)
    funds = await mf_service.search_schemes(
        query=search,
        category=category,
        plan_type=plan_type,
        amc=amc,
        limit=limit
    )
    return funds


@router.get("/mutual-funds/{scheme_code}")
async def get_mutual_fund_details(
    scheme_code: str,
    include_history: bool = Query(False),
    history_days: int = Query(365, ge=30, le=1825),
    db: AsyncSession = Depends(get_db)
):
    """Get details for a specific mutual fund."""
    result = await db.execute(
        select(MutualFund).where(MutualFund.scheme_code == scheme_code)
    )
    fund = result.scalar_one_or_none()
    
    if not fund:
        raise HTTPException(status_code=404, detail="Mutual fund not found")
    
    response = MutualFundResponse.model_validate(fund).model_dump()
    
    if include_history:
        mf_service = MutualFundDataService(db)
        history = await mf_service.get_historical_nav(scheme_code, history_days)
        response["nav_history"] = history
    
    return response


@router.get("/etfs", response_model=List[ETFResponse])
async def get_etfs(
    underlying: Optional[str] = Query(None, description="Filter by underlying: gold, silver, nifty50"),
    db: AsyncSession = Depends(get_db)
):
    """Get available ETFs."""
    query = select(ETF)
    if underlying:
        query = query.where(ETF.underlying == underlying)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/gold-silver", response_model=List[GoldPriceResponse])
async def get_gold_silver_prices(
    metal_type: Optional[str] = Query(None, pattern="^(gold|silver)$"),
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """Get gold and silver price history."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = select(GoldSilverPrice).where(
        GoldSilverPrice.recorded_at >= cutoff
    ).order_by(desc(GoldSilverPrice.recorded_at))
    
    if metal_type:
        query = query.where(GoldSilverPrice.metal_type == metal_type)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/digital-gold")
async def get_digital_gold_providers(db: AsyncSession = Depends(get_db)):
    """Get digital gold providers with current prices."""
    result = await db.execute(
        select(DigitalGoldProvider).order_by(DigitalGoldProvider.spread_percent)
    )
    providers = result.scalars().all()
    return [
        {
            "provider": p.provider_name,
            "buy_price": p.buy_price,
            "sell_price": p.sell_price,
            "spread_percent": p.spread_percent,
            "min_investment": p.min_investment,
            "features": p.features,
            "website": p.website_url
        }
        for p in providers
    ]


@router.get("/macro-indicators", response_model=List[MacroIndicatorResponse])
async def get_macro_indicators(db: AsyncSession = Depends(get_db)):
    """Get current macro economic indicators."""
    # Get latest value for each indicator
    subquery = (
        select(
            MacroIndicator.indicator_name,
            MacroIndicator.value,
            MacroIndicator.previous_value,
            MacroIndicator.change_percent,
            MacroIndicator.unit,
            MacroIndicator.recorded_at
        )
        .distinct(MacroIndicator.indicator_name)
        .order_by(MacroIndicator.indicator_name, desc(MacroIndicator.recorded_at))
    )
    
    result = await db.execute(subquery)
    return result.all()


@router.get("/news", response_model=List[NewsResponse])
async def get_market_news(
    category: Optional[str] = Query(None, description="Filter by category: gold, rbi, inflation, equity"),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get recent market news."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = select(MarketNews).where(
        MarketNews.published_at >= cutoff
    ).order_by(desc(MarketNews.published_at)).limit(limit)
    
    result = await db.execute(query)
    news_items = result.scalars().all()
    
    if category:
        news_items = [n for n in news_items if category in (n.categories or [])]
    
    return news_items


@router.post("/refresh")
async def trigger_data_refresh(
    data_type: str = Query(..., pattern="^(fd_rates|mf_nav|gold_prices|news|all)$"),
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger data refresh (admin only in production)."""
    from app.tasks.data_refresh_tasks import (refresh_fd_rates,
                                              refresh_gold_prices,
                                              refresh_mf_navs, refresh_news)
    
    tasks_map = {
        "fd_rates": refresh_fd_rates,
        "mf_nav": refresh_mf_navs,
        "gold_prices": refresh_gold_prices,
        "news": refresh_news,
    }
    
    if data_type == "all":
        for task in tasks_map.values():
            task.delay()
        return {"message": "All refresh tasks queued"}
    else:
        tasks_map[data_type].delay()
        return {"message": f"{data_type} refresh task queued"}