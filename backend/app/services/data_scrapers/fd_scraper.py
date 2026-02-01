"""
FD rate scraper using multiple strategies:
1. Aggregator sites (most reliable - one page, all banks)
2. Individual bank sites with better LLM model
3. Fallback to seed data
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.models.asset_data import FixedDepositRate
from app.services.ai_engine.openrouter_client import OpenRouterClient
from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# STRATEGY 1: Aggregator Sites (BEST - all banks in one page)
# =============================================================================
AGGREGATOR_SOURCES = [
    {
        "name": "BankBazaar FD Rates",
        "url": "https://www.bankbazaar.com/fixed-deposit-rate.html",
        "type": "aggregator",
    },
    {
        "name": "Paisabazaar FD Rates",
        "url": "https://www.paisabazaar.com/fixed-deposit/fd-interest-rates/",
        "type": "aggregator",
    },
    {
        "name": "ET Money FD Rates",
        "url": "https://www.etmoney.com/fixed-deposit/fd-interest-rates",
        "type": "aggregator",
    },
]

# =============================================================================
# STRATEGY 2: Individual Bank Sites (Fallback)
# =============================================================================
BANK_SOURCES = [
    {"bank_name": "Ujjivan Small Finance Bank", "bank_type": "small_finance", "url": "https://www.ujjivansfb.in/fixed-deposit-interest-rates"},
    {"bank_name": "AU Small Finance Bank", "bank_type": "small_finance", "url": "https://www.aubank.in/personal-banking/deposits/fixed-deposit"},
    {"bank_name": "Equitas Small Finance Bank", "bank_type": "small_finance", "url": "https://www.equitasbank.com/fixed-deposits"},
    {"bank_name": "HDFC Bank", "bank_type": "private", "url": "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit-interest-rate"},
    {"bank_name": "ICICI Bank", "bank_type": "private", "url": "https://www.icicibank.com/personal-banking/deposits/fixed-deposit/fd-interest-rates"},
    {"bank_name": "SBI", "bank_type": "public", "url": "https://sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits"},
]

# =============================================================================
# STRATEGY 3: Seed Data (Always works - update monthly via admin)
# =============================================================================
SEED_FD_RATES = [
    # Small Finance Banks (highest rates)
    {"bank_name": "Ujjivan Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.25, "rate_senior": 8.75},
    {"bank_name": "Ujjivan Small Finance Bank", "bank_type": "small_finance", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 1094, "rate_general": 8.00, "rate_senior": 8.50},
    {"bank_name": "AU Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.00, "rate_senior": 8.50},
    {"bank_name": "AU Small Finance Bank", "bank_type": "small_finance", "tenure_display": "18 months", "tenure_min_days": 546, "tenure_max_days": 729, "rate_general": 8.10, "rate_senior": 8.60},
    {"bank_name": "Equitas Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.00, "rate_senior": 8.50},
    {"bank_name": "Utkarsh Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.25, "rate_senior": 8.75},
    {"bank_name": "Jana Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.00, "rate_senior": 8.50},
    {"bank_name": "Suryoday Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.25, "rate_senior": 8.75},
    {"bank_name": "ESAF Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.00, "rate_senior": 8.50},
    {"bank_name": "Unity Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.50, "rate_senior": 9.00},
    {"bank_name": "North East Small Finance Bank", "bank_type": "small_finance", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.50, "rate_senior": 9.00},
    
    # Private Banks
    {"bank_name": "HDFC Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "HDFC Bank", "bank_type": "private", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 1094, "rate_general": 7.00, "rate_senior": 7.50},
    {"bank_name": "ICICI Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.90, "rate_senior": 7.40},
    {"bank_name": "ICICI Bank", "bank_type": "private", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 1094, "rate_general": 7.00, "rate_senior": 7.50},
    {"bank_name": "Axis Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.85, "rate_senior": 7.35},
    {"bank_name": "Kotak Mahindra Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "Yes Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.25, "rate_senior": 7.75},
    {"bank_name": "IndusInd Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.25, "rate_senior": 7.75},
    {"bank_name": "IDFC First Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.25, "rate_senior": 7.75},
    {"bank_name": "RBL Bank", "bank_type": "private", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.30, "rate_senior": 7.80},
    
    # Public Banks
    {"bank_name": "SBI", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "SBI", "bank_type": "public", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 1094, "rate_general": 7.00, "rate_senior": 7.50},
    {"bank_name": "Bank of Baroda", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.85, "rate_senior": 7.35},
    {"bank_name": "Punjab National Bank", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "Canara Bank", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.85, "rate_senior": 7.35},
    {"bank_name": "Union Bank of India", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "Indian Bank", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "Bank of India", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "Indian Overseas Bank", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.80, "rate_senior": 7.30},
    {"bank_name": "Central Bank of India", "bank_type": "public", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 6.85, "rate_senior": 7.35},
    
    # NBFCs (higher rates, slightly more risk)
    {"bank_name": "Bajaj Finance", "bank_type": "nbfc", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.05, "rate_senior": 8.30},
    {"bank_name": "Bajaj Finance", "bank_type": "nbfc", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 1094, "rate_general": 8.25, "rate_senior": 8.50},
    {"bank_name": "Shriram Finance", "bank_type": "nbfc", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 8.19, "rate_senior": 8.69},
    {"bank_name": "Shriram Finance", "bank_type": "nbfc", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 1094, "rate_general": 8.39, "rate_senior": 8.89},
    {"bank_name": "Mahindra Finance", "bank_type": "nbfc", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.90, "rate_senior": 8.15},
    {"bank_name": "LIC Housing Finance", "bank_type": "nbfc", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.75, "rate_senior": 8.00},
    {"bank_name": "HDFC Ltd", "bank_type": "nbfc", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.40, "rate_senior": 7.65},
    {"bank_name": "PNB Housing Finance", "bank_type": "nbfc", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.65, "rate_senior": 7.90},
    
    # Post Office (Government backed, tax benefits)
    {"bank_name": "Post Office TD", "bank_type": "post_office", "tenure_display": "1 year", "tenure_min_days": 365, "tenure_max_days": 365, "rate_general": 6.90, "rate_senior": 6.90},
    {"bank_name": "Post Office TD", "bank_type": "post_office", "tenure_display": "2 years", "tenure_min_days": 730, "tenure_max_days": 730, "rate_general": 7.00, "rate_senior": 7.00},
    {"bank_name": "Post Office TD", "bank_type": "post_office", "tenure_display": "3 years", "tenure_min_days": 1095, "tenure_max_days": 1095, "rate_general": 7.10, "rate_senior": 7.10},
    {"bank_name": "Post Office TD", "bank_type": "post_office", "tenure_display": "5 years (80C)", "tenure_min_days": 1825, "tenure_max_days": 1825, "rate_general": 7.50, "rate_senior": 7.50},
]


class DynamicFDScraper:
    """
    Multi-strategy FD rate scraper.
    Priority: Aggregator > Individual Banks > Seed Data
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()
    
    async def scrape_all_fd_rates(self) -> Dict[str, Any]:
        """
        Main entry point - try strategies in order of reliability.
        """
        results = {
            "strategy_used": None,
            "success": 0,
            "failed": 0,
            "total_rates": 0,
            "banks_covered": 0
        }
        
        # Strategy 1: Try aggregator sites first (most reliable)
        logger.info("Trying Strategy 1: Aggregator sites...")
        aggregator_rates = await self._scrape_aggregators()
        
        if aggregator_rates and len(aggregator_rates) >= 10:
            results["strategy_used"] = "aggregator"
            results["total_rates"] = len(aggregator_rates)
            results["success"] = 1
            await self._store_all_rates(aggregator_rates)
            logger.info(f"Aggregator strategy succeeded with {len(aggregator_rates)} rates")
            return results
        
        # Strategy 2: Scrape individual bank sites
        logger.info("Trying Strategy 2: Individual bank sites...")
        bank_rates = await self._scrape_individual_banks()
        
        if bank_rates and len(bank_rates) >= 5:
            results["strategy_used"] = "individual_banks"
            results["total_rates"] = len(bank_rates)
            results["success"] = len([r for r in bank_rates if r])
            await self._store_all_rates(bank_rates)
            logger.info(f"Individual banks strategy got {len(bank_rates)} rates")
            # Don't return - also add seed data for banks we missed
        
        # Strategy 3: Use seed data (always works)
        logger.info("Using Strategy 3: Seed data for comprehensive coverage...")
        
        # Merge scraped rates with seed data (prefer scraped)
        scraped_banks = {r["bank_name"] for r in (aggregator_rates or []) + (bank_rates or [])}
        seed_rates_to_add = [r for r in SEED_FD_RATES if r["bank_name"] not in scraped_banks]
        
        if seed_rates_to_add:
            await self._store_seed_rates(seed_rates_to_add)
            results["total_rates"] += len(seed_rates_to_add)
            logger.info(f"Added {len(seed_rates_to_add)} seed rates for missing banks")
        
        if not results["strategy_used"]:
            results["strategy_used"] = "seed_data"
            results["total_rates"] = len(SEED_FD_RATES)
            await self._store_seed_rates(SEED_FD_RATES)
        
        # Count unique banks
        result = await self.db.execute(
            FixedDepositRate.__table__.select()
        )
        all_rates = result.fetchall()
        results["banks_covered"] = len(set(r.bank_name for r in all_rates))
        results["total_rates"] = len(all_rates)
        
        return results
    
    async def _scrape_aggregators(self) -> List[Dict[str, Any]]:
        """Scrape FD rates from aggregator sites."""
        all_rates = []
        
        for source in AGGREGATOR_SOURCES:
            try:
                rates = await self._scrape_single_source(source, is_aggregator=True)
                if rates:
                    all_rates.extend(rates)
                    logger.info(f"Got {len(rates)} rates from {source['name']}")
                    # If we got good data from one aggregator, that's enough
                    if len(rates) >= 15:
                        return all_rates
            except Exception as e:
                logger.warning(f"Aggregator {source['name']} failed: {e}")
        
        return all_rates
    
    async def _scrape_individual_banks(self) -> List[Dict[str, Any]]:
        """Scrape individual bank websites."""
        all_rates = []
        
        for source in BANK_SOURCES[:5]:  # Limit to top 5 to save time
            try:
                rates = await self._scrape_single_source(source, is_aggregator=False)
                if rates:
                    for r in rates:
                        r["bank_name"] = source["bank_name"]
                        r["bank_type"] = source["bank_type"]
                    all_rates.extend(rates)
            except Exception as e:
                logger.warning(f"Bank {source.get('bank_name', source.get('name'))} failed: {e}")
        
        return all_rates
    
    async def _scrape_single_source(
        self,
        source: Dict[str, str],
        is_aggregator: bool = False
    ) -> List[Dict[str, Any]]:
        """Scrape a single source (aggregator or bank)."""
        browser_config = BrowserConfig(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            page_timeout=60000,
            delay_before_return_html=5.0,  # Wait for JS tables to render
        )
        
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(url=source["url"], config=crawler_config)
                
                if not result.success:
                    logger.warning(f"Crawl failed for {source.get('name', source.get('bank_name'))}")
                    return []
                
                content = result.markdown or result.html or ""
                
                # Log content length for debugging
                logger.debug(f"Got {len(content)} chars from {source.get('name', source.get('bank_name'))}")
                
                # Use PRIMARY model for better extraction (Claude > Llama)
                rates = await self._extract_rates_with_llm(
                    content=content,
                    source=source,
                    is_aggregator=is_aggregator
                )
                
                return rates
                
        except Exception as e:
            logger.error(f"Error scraping {source.get('name', source.get('bank_name'))}: {e}")
            return []
    
    async def _extract_rates_with_llm(
        self,
        content: str,
        source: Dict[str, str],
        is_aggregator: bool
    ) -> List[Dict[str, Any]]:
        """Extract FD rates using LLM."""
        # Truncate but keep more content for aggregators
        max_len = 25000 if is_aggregator else 15000
        content = content[:max_len]
        
        if is_aggregator:
            prompt = f"""Extract ALL Fixed Deposit interest rates from this aggregator page.

SOURCE: {source['name']}
URL: {source['url']}

PAGE CONTENT:
{content}

TASK: Extract FD rates for ALL banks listed. For each rate entry:
- bank_name: Full bank name (e.g., "HDFC Bank", "SBI", "Ujjivan Small Finance Bank")
- bank_type: One of "private", "public", "small_finance", "nbfc", "post_office"
- tenure_display: Human readable (e.g., "1 year", "18 months", "2-3 years")
- tenure_min_days: Minimum days (1 year = 365, 1 month = 30)
- tenure_max_days: Maximum days
- rate_general: Interest rate for general public (percentage number like 7.5)
- rate_senior: Senior citizen rate if shown (null if not available)

Extract as many bank rates as possible. Focus on 1-year and 2-year tenures.

Return JSON:
{{
    "rates": [
        {{"bank_name": "...", "bank_type": "...", "tenure_display": "...", "tenure_min_days": 365, "tenure_max_days": 729, "rate_general": 7.5, "rate_senior": 8.0}}
    ],
    "extraction_confidence": 0.0-1.0
}}"""
        else:
            prompt = f"""Extract Fixed Deposit interest rates from this bank page.

BANK: {source.get('bank_name', 'Unknown')}
BANK TYPE: {source.get('bank_type', 'unknown')}

PAGE CONTENT:
{content}

TASK: Extract all FD rate slabs. For each:
- tenure_display: Human readable tenure
- tenure_min_days: Minimum days (1 year = 365)
- tenure_max_days: Maximum days
- rate_general: General public rate (percentage)
- rate_senior: Senior citizen rate (null if not shown)

Return JSON:
{{
    "rates": [...],
    "extraction_confidence": 0.0-1.0
}}"""
        
        try:
            # Use PRIMARY model (Claude) for better accuracy
            response = await self.ai_client.complete(
                prompt=prompt,
                model=settings.PRIMARY_MODEL,  # Use Claude, not Llama
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=4096
            )
            
            result = json.loads(response)
            rates = result.get("rates", [])
            confidence = result.get("extraction_confidence", 0.5)
            
            if confidence < 0.4:
                logger.warning(f"Low confidence ({confidence}) for {source.get('name', source.get('bank_name'))}")
            
            # Validate rates
            valid_rates = []
            for r in rates:
                if r.get("rate_general") and r.get("rate_general") > 0:
                    valid_rates.append(r)
            
            return valid_rates
            
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return []
    
    async def _store_all_rates(self, rates: List[Dict[str, Any]]):
        """Store scraped rates in database."""
        if not rates:
            return
        
        # Clear existing rates
        await self.db.execute(delete(FixedDepositRate))
        
        for rate in rates:
            fd = FixedDepositRate(
                bank_name=rate.get("bank_name", "Unknown"),
                bank_type=rate.get("bank_type", "unknown"),
                tenure_min_days=rate.get("tenure_min_days", 0),
                tenure_max_days=rate.get("tenure_max_days", 0),
                tenure_display=rate.get("tenure_display", ""),
                interest_rate_general=rate.get("rate_general", 0),
                interest_rate_senior=rate.get("rate_senior"),
                source_url=rate.get("source_url", "scraped"),
                scraped_at=datetime.utcnow()
            )
            self.db.add(fd)
        
        await self.db.commit()
        logger.info(f"Stored {len(rates)} FD rates")
    
    async def _store_seed_rates(self, rates: List[Dict[str, Any]]):
        """Store seed rates (for banks not scraped)."""
        for rate in rates:
            # Check if this bank+tenure already exists
            existing = await self.db.execute(
                FixedDepositRate.__table__.select().where(
                    FixedDepositRate.bank_name == rate["bank_name"],
                    FixedDepositRate.tenure_display == rate["tenure_display"]
                )
            )
            if existing.fetchone():
                continue
            
            fd = FixedDepositRate(
                bank_name=rate["bank_name"],
                bank_type=rate["bank_type"],
                tenure_min_days=rate.get("tenure_min_days", 365),
                tenure_max_days=rate.get("tenure_max_days", 729),
                tenure_display=rate["tenure_display"],
                interest_rate_general=rate["rate_general"],
                interest_rate_senior=rate.get("rate_senior"),
                source_url="seed_data",
                scraped_at=datetime.utcnow(),
                is_verified=False
            )
            self.db.add(fd)
        
        await self.db.commit()