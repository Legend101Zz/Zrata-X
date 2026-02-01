#!/usr/bin/env python
"""
Master script to run all data scrapers.
Usage: python -m app.scripts.run_all_scrapers [--type all|mf|fd|gold|etf|macro|news]
"""
import argparse
import asyncio
import logging
import sys
from datetime import datetime

from app.config import get_settings
from app.database import get_async_session_factory

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("scraper")

settings = get_settings()


async def scrape_mutual_funds(db):
    """Scrape mutual fund data from MFAPI.in"""
    from app.services.data_scrapers.mf_data_service import \
        MutualFundDataService
    
    logger.info("="*50)
    logger.info("SCRAPING: Mutual Funds (MFAPI.in)")
    logger.info("="*50)
    
    service = MutualFundDataService(db)
    try:
        # Sync all schemes first
        logger.info("Syncing mutual fund schemes...")
        sync_result = await service.sync_all_schemes()
        logger.info(f"Scheme sync: {sync_result}")
        
        # Update NAVs
        logger.info("Updating NAVs...")
        nav_result = await service.update_navs()
        logger.info(f"NAV update: {nav_result}")
        
        return {"status": "success", "sync": sync_result, "nav": nav_result}
    finally:
        await service.close()


async def scrape_etfs(db):
    """Scrape ETF data using yfinance"""
    from app.services.data_scrapers.etf_data_service import ETFDataService
    
    logger.info("="*50)
    logger.info("SCRAPING: ETFs (yfinance)")
    logger.info("="*50)
    
    service = ETFDataService(db)
    try:
        # Sync ETF list
        logger.info("Syncing ETF list...")
        sync_result = await service.sync_etf_list()
        logger.info(f"ETF sync: {sync_result}")
        
        # Update prices
        logger.info("Updating ETF prices...")
        price_result = await service.update_etf_prices()
        logger.info(f"Price update: {price_result}")
        
        return {"status": "success", "sync": sync_result, "prices": price_result}
    finally:
        await service.close()


async def scrape_gold_silver(db):
    """Scrape gold and silver prices"""
    from app.services.market_data.gold_price_service import GoldPriceService
    
    logger.info("="*50)
    logger.info("SCRAPING: Gold & Silver Prices")
    logger.info("="*50)
    
    service = GoldPriceService(db)
    try:
        result = await service.fetch_and_store_prices()
        logger.info(f"Gold/Silver result: {result}")
        return result
    finally:
        await service.close()


async def scrape_fd_rates(db):
    """Scrape FD rates from banks using Crawl4AI"""
    from app.services.data_scrapers.fd_scraper import DynamicFDScraper
    
    logger.info("="*50)
    logger.info("SCRAPING: Fixed Deposit Rates (Crawl4AI)")
    logger.info("="*50)
    
    scraper = DynamicFDScraper(db)
    result = await scraper.scrape_all_fd_rates()
    logger.info(f"FD scrape result: {result}")
    return result


async def scrape_macro_indicators(db):
    """Fetch macro economic indicators"""
    from app.services.market_data.macro_data_service import MacroDataService
    
    logger.info("="*50)
    logger.info("SCRAPING: Macro Indicators")
    logger.info("="*50)
    
    service = MacroDataService(db)
    try:
        result = await service.refresh_all_indicators()
        logger.info(f"Macro indicators result: {result}")
        return result
    finally:
        await service.close()


async def scrape_news(db):
    """Scrape financial news"""
    from app.services.market_data.news_service import NewsService
    
    logger.info("="*50)
    logger.info("SCRAPING: Financial News")
    logger.info("="*50)
    
    service = NewsService(db)
    result = await service.fetch_and_analyze_news()
    logger.info(f"News scrape result: {result}")
    return result


async def run_scrapers(scrape_type: str = "all"):
    """Run specified scrapers"""
    start_time = datetime.now()
    logger.info(f"Starting scraper run at {start_time}")
    logger.info(f"Scrape type: {scrape_type}")
    
    results = {}
    
    # Get database session
    AsyncSessionLocal = get_async_session_factory()
    
    async with AsyncSessionLocal() as db:
        try:
            if scrape_type in ["all", "mf"]:
                results["mutual_funds"] = await scrape_mutual_funds(db)
            
            if scrape_type in ["all", "etf"]:
                results["etfs"] = await scrape_etfs(db)
            
            if scrape_type in ["all", "gold"]:
                results["gold_silver"] = await scrape_gold_silver(db)
            
            if scrape_type in ["all", "fd"]:
                results["fd_rates"] = await scrape_fd_rates(db)
            
            if scrape_type in ["all", "macro"]:
                results["macro_indicators"] = await scrape_macro_indicators(db)
            
            if scrape_type in ["all", "news"]:
                results["news"] = await scrape_news(db)
            
            await db.commit()
            
        except Exception as e:
            logger.error(f"Scraper error: {e}", exc_info=True)
            await db.rollback()
            raise
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info("="*50)
    logger.info("SCRAPER RUN COMPLETE")
    logger.info(f"Duration: {duration:.2f} seconds")
    logger.info(f"Results: {results}")
    logger.info("="*50)
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Run Zrata-X data scrapers")
    parser.add_argument(
        "--type",
        choices=["all", "mf", "etf", "gold", "fd", "macro", "news"],
        default="all",
        help="Type of data to scrape (default: all)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        asyncio.run(run_scrapers(args.type))
    except KeyboardInterrupt:
        logger.info("Scraper interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()