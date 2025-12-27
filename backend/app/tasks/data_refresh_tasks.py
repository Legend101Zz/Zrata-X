"""
Celery tasks for data refresh operations.
"""
import asyncio
import logging

from app.config import get_settings
from app.database import Base
from celery import shared_task
from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)

logger = logging.getLogger(__name__)
settings = get_settings()


def get_async_session():
    """Create async session for Celery tasks."""
    engine = create_async_engine(settings.DATABASE_URL)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def run_async(coro):
    """Helper to run async code in Celery."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@shared_task(name="app.tasks.data_refresh_tasks.refresh_mf_navs")
def refresh_mf_navs():
    """Refresh mutual fund NAV data from MFAPI."""
    async def _refresh():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from app.services.data_scrapers.mf_data_service import \
                MutualFundDataService
            
            service = MutualFundDataService(db)
            
            # First sync all schemes (runs less frequently)
            logger.info("Syncing mutual fund schemes...")
            await service.sync_all_schemes()
            
            # Then update NAVs
            logger.info("Updating NAVs...")
            await service.update_navs()
            
            logger.info("MF NAV refresh completed")
            return {"status": "success"}
    
    return run_async(_refresh())


@shared_task(name="app.tasks.data_refresh_tasks.refresh_fd_rates")
def refresh_fd_rates():
    """Refresh FD rates from all sources."""
    async def _refresh():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from app.services.data_scrapers.fd_scraper import DynamicFDScraper
            
            scraper = DynamicFDScraper(db)
            result = await scraper.scrape_all_fd_rates()
            
            logger.info(f"FD rates refresh completed: {result}")
            return result
    
    return run_async(_refresh())


@shared_task(name="app.tasks.data_refresh_tasks.refresh_gold_prices")
def refresh_gold_prices():
    """Refresh gold and silver prices."""
    async def _refresh():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from app.services.market_data.gold_price_service import \
                GoldPriceService
            
            service = GoldPriceService(db)
            result = await service.fetch_and_store_prices()
            
            logger.info(f"Gold/Silver prices refreshed: {result}")
            return result
    
    return run_async(_refresh())


@shared_task(name="app.tasks.data_refresh_tasks.refresh_news")
def refresh_news():
    """Refresh and analyze financial news."""
    async def _refresh():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from app.services.market_data.news_service import NewsService
            
            service = NewsService(db)
            result = await service.fetch_and_analyze_news()
            
            logger.info(f"News refresh completed: {result}")
            return result
    
    return run_async(_refresh())


@shared_task(name="app.tasks.data_refresh_tasks.refresh_macro_indicators")
def refresh_macro_indicators():
    """Refresh macro economic indicators."""
    async def _refresh():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from app.services.market_data.macro_data_service import \
                MacroDataService
            
            service = MacroDataService(db)
            result = await service.refresh_all_indicators()
            
            logger.info(f"Macro indicators refreshed: {result}")
            return result
    
    return run_async(_refresh())


@shared_task(name="app.tasks.data_refresh_tasks.refresh_all_data")
def refresh_all_data():
    """Full data refresh - runs weekly."""
    logger.info("Starting full data refresh...")
    
    results = {}
    
    # Run all refresh tasks
    results["mf"] = refresh_mf_navs()
    results["fd"] = refresh_fd_rates()
    results["gold"] = refresh_gold_prices()
    results["news"] = refresh_news()
    results["macro"] = refresh_macro_indicators()
    
    logger.info(f"Full data refresh completed: {results}")
    return results


@shared_task(name="app.tasks.data_refresh_tasks.discover_new_fd_sources")
def discover_new_fd_sources():
    """Discover new FD rate sources - runs monthly."""
    async def _discover():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from app.models.asset_data import DataSource
            from app.services.data_scrapers.fd_scraper import DynamicFDScraper
            
            scraper = DynamicFDScraper(db)
            new_sources = await scraper.discover_fd_sources()
            
            # Add new sources to database
            added = 0
            for source in new_sources:
                data_source = DataSource(
                    source_type="fd_rates",
                    source_name=source["name"],
                    source_url=source["url"],
                    scraper_config={"bank_type": source.get("type", "unknown")},
                    is_active=True,
                    scrape_interval_seconds=86400  # Daily
                )
                db.add(data_source)
                added += 1
            
            await db.commit()
            
            logger.info(f"Discovered {len(new_sources)} new FD sources, added {added}")
            return {"discovered": len(new_sources), "added": added}
    
    return run_async(_discover())


@shared_task(name="app.tasks.data_refresh_tasks.cleanup_old_data")
def cleanup_old_data(days: int = 90):
    """Clean up old data to manage database size."""
    async def _cleanup():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from datetime import datetime, timedelta

            from app.models.asset_data import (GoldSilverPrice, MacroIndicator,
                                               MarketNews)
            from sqlalchemy import delete
            
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            # Delete old gold/silver prices (keep last 90 days)
            await db.execute(
                delete(GoldSilverPrice).where(GoldSilverPrice.recorded_at < cutoff)
            )
            
            # Delete old news (keep last 90 days)
            await db.execute(
                delete(MarketNews).where(MarketNews.scraped_at < cutoff)
            )
            
            # Keep macro indicators longer (365 days)
            macro_cutoff = datetime.utcnow() - timedelta(days=365)
            await db.execute(
                delete(MacroIndicator).where(MacroIndicator.recorded_at < macro_cutoff)
            )
            
            await db.commit()
            logger.info(f"Cleaned up data older than {days} days")
            return {"status": "success"}
    
    return run_async(_cleanup())


@shared_task(name="app.tasks.data_refresh_tasks.update_portfolio_values")
def update_portfolio_values():
    """Update current values for all user portfolios."""
    async def _update():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            from datetime import datetime

            from app.models.asset_data import ETF, GoldSilverPrice, MutualFund
            from app.models.user import PortfolioHolding
            from sqlalchemy import select, update

            # Get all holdings
            result = await db.execute(select(PortfolioHolding))
            holdings = result.scalars().all()
            
            updated = 0
            for holding in holdings:
                new_value = None
                
                if holding.asset_type == "mutual_fund":
                    mf_result = await db.execute(
                        select(MutualFund).where(
                            MutualFund.scheme_code == holding.asset_identifier
                        )
                    )
                    mf = mf_result.scalar_one_or_none()
                    if mf and holding.units:
                        new_value = holding.units * mf.nav
                
                elif holding.asset_type == "etf":
                    etf_result = await db.execute(
                        select(ETF).where(ETF.symbol == holding.asset_identifier)
                    )
                    etf = etf_result.scalar_one_or_none()
                    if etf and holding.units:
                        new_value = holding.units * etf.market_price
                
                elif holding.asset_type in ["gold", "silver"]:
                    metal_result = await db.execute(
                        select(GoldSilverPrice)
                        .where(GoldSilverPrice.metal_type == holding.asset_type)
                        .order_by(GoldSilverPrice.recorded_at.desc())
                        .limit(1)
                    )
                    metal = metal_result.scalar_one_or_none()
                    if metal and holding.units:
                        new_value = holding.units * metal.price_per_gram
                
                elif holding.asset_type == "fd":
                    # FDs: Calculate current value with accrued interest
                    if holding.interest_rate and holding.purchase_date:
                        days_held = (datetime.utcnow() - holding.purchase_date).days
                        accrued = holding.invested_amount * (holding.interest_rate / 100) * (days_held / 365)
                        new_value = holding.invested_amount + accrued
                
                if new_value:
                    holding.current_value = new_value
                    holding.last_valued_at = datetime.utcnow()
                    updated += 1
            
            await db.commit()
            logger.info(f"Updated {updated} portfolio holdings")
            return {"updated": updated}
    
    return run_async(_update())