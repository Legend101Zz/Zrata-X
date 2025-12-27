"""
Initialize database with seed data.
Run this ONCE on first deployment, then cron jobs update prices.
"""
import asyncio
import logging

from app.database import AsyncSessionLocal
from app.models.asset_data import ETF, DataSource, MacroIndicator
from app.seed_data.banks_and_fds import KNOWN_FD_SOURCES
from app.seed_data.etfs import KNOWN_ETFS
from app.seed_data.macro_indicators import FALLBACK_MACRO_VALUES
from sqlalchemy import select

logger = logging.getLogger(__name__)


async def seed_fd_sources():
    """Seed known FD bank sources."""
    async with AsyncSessionLocal() as db:
        for bank in KNOWN_FD_SOURCES:
            # Check if exists
            result = await db.execute(
                select(DataSource).where(
                    DataSource.source_url == bank.get("fd_rates_url")
                )
            )
            if result.scalar_one_or_none():
                continue
            
            source = DataSource(
                source_type="fd_rates",
                source_name=bank["bank_name"],
                source_url=bank.get("fd_rates_url", bank["website"]),
                scraper_config={
                    "bank_type": bank["bank_type"],
                    "has_credit_card_offer": bank.get("has_credit_card_offer", False),
                    "credit_card_details": bank.get("credit_card_details"),
                },
                is_active=True,
                scrape_interval_seconds=86400,  # Daily
            )
            db.add(source)
        
        await db.commit()
        logger.info(f"Seeded {len(KNOWN_FD_SOURCES)} FD sources")


async def seed_etfs():
    """Seed known ETFs."""
    async with AsyncSessionLocal() as db:
        for etf_data in KNOWN_ETFS:
            # Check if exists
            result = await db.execute(
                select(ETF).where(ETF.symbol == etf_data["symbol"])
            )
            if result.scalar_one_or_none():
                continue
            
            etf = ETF(
                symbol=etf_data["symbol"],
                name=etf_data["name"],
                underlying=etf_data["underlying"],
                nav=0.0,  # Will be updated by cron
                market_price=0.0,
                premium_discount=0.0,
                expense_ratio=etf_data.get("expense_ratio"),
                exchange="NSE",
            )
            db.add(etf)
        
        await db.commit()
        logger.info(f"Seeded {len(KNOWN_ETFS)} ETFs")


async def seed_macro_indicators():
    """Seed initial macro indicator values."""
    async with AsyncSessionLocal() as db:
        for name, data in FALLBACK_MACRO_VALUES.items():
            # Check if we have any data
            result = await db.execute(
                select(MacroIndicator).where(
                    MacroIndicator.indicator_name == name
                ).limit(1)
            )
            if result.scalar_one_or_none():
                continue
            
            indicator = MacroIndicator(
                indicator_name=name,
                value=data["value"],
                unit=data["unit"],
                source=f"seed_data_{data['source']}",
            )
            db.add(indicator)
        
        await db.commit()
        logger.info(f"Seeded {len(FALLBACK_MACRO_VALUES)} macro indicators")


async def main():
    """Run all seed operations."""
    logger.info("Starting database seed...")
    
    await seed_fd_sources()
    await seed_etfs()
    await seed_macro_indicators()
    
    logger.info("Database seeding complete!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())