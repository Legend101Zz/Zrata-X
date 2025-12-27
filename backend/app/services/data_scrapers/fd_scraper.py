"""
Dynamic FD rate scraper using Crawl4AI.
Discovers and scrapes FD rates from banks without hardcoded URLs.
"""
import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.models.asset_data import DataSource, FixedDepositRate
from app.services.ai_engine.openrouter_client import OpenRouterClient
from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


class DynamicFDScraper:
    """
    Scrapes FD rates dynamically without hardcoded bank URLs.
    Uses AI to understand page structure and extract rates.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()
        
    async def discover_fd_sources(self) -> List[Dict[str, Any]]:
        """
        Use AI + web search to discover new FD rate sources.
        This runs periodically to find new banks/platforms.
        """
        # First, get existing sources
        result = await self.db.execute(
            select(DataSource).where(DataSource.source_type == "fd_rates")
        )
        existing_urls = {s.source_url for s in result.scalars().all()}
        
        # Use AI to suggest sources to scrape
        discovery_prompt = """
        I need to find websites that list current Fixed Deposit interest rates for Indian banks.
        
        Suggest 10 reliable sources that would have:
        1. Small Finance Bank FD rates (Utkarsh, Ujjivan, Equitas, AU, Suryoday, etc.)
        2. Private bank FD rates
        3. NBFC FD rates
        4. Aggregator sites that compare FD rates
        
        For each source, provide:
        - Bank/site name
        - URL
        - Type (small_finance_bank, private_bank, public_bank, nbfc, aggregator)
        
        Return as JSON array with keys: name, url, type
        """
        
        response = await self.ai_client.complete(
            prompt=discovery_prompt,
            model=settings.FAST_MODEL,
            response_format={"type": "json_object"}
        )
        
        try:
            sources = json.loads(response)
            new_sources = [s for s in sources if s.get("url") not in existing_urls]
            return new_sources
        except json.JSONDecodeError:
            logger.error("Failed to parse AI response for FD sources")
            return []
    
    async def scrape_fd_rates(self, source: DataSource) -> List[Dict[str, Any]]:
        """
        Scrape FD rates from a discovered source using Crawl4AI with LLM extraction.
        """
        browser_config = BrowserConfig(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        
        # Define extraction schema for FD rates
        extraction_schema = {
            "type": "object",
            "properties": {
                "fd_rates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tenure": {"type": "string"},
                            "tenure_days_min": {"type": "integer"},
                            "tenure_days_max": {"type": "integer"},
                            "interest_rate_general": {"type": "number"},
                            "interest_rate_senior": {"type": "number"},
                            "min_amount": {"type": "number"},
                            "special_features": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "bank_name": {"type": "string"},
                "last_updated": {"type": "string"}
            }
        }
        
        extraction_strategy = LLMExtractionStrategy(
            provider=f"openrouter/{settings.FAST_MODEL}",
            api_key=settings.OPENROUTER_API_KEY,
            schema=extraction_schema,
            instruction="""
            Extract all Fixed Deposit interest rates from this page.
            For each rate tier, extract:
            - Tenure period (convert to days if possible)
            - Interest rate for general customers
            - Interest rate for senior citizens (if available)
            - Minimum deposit amount
            - Any special features (credit card offer, premature withdrawal, etc.)
            
            Also extract the bank name and when rates were last updated.
            """
        )
        
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            extraction_strategy=extraction_strategy,
            wait_for="networkidle",
            page_timeout=30000
        )
        
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(url=source.source_url, config=crawler_config)
                
                if result.success and result.extracted_content:
                    extracted = json.loads(result.extracted_content)
                    
                    # Update source success count
                    source.success_count += 1
                    source.last_scraped = datetime.utcnow()
                    await self.db.commit()
                    
                    return extracted.get("fd_rates", [])
                else:
                    logger.warning(f"Failed to scrape {source.source_url}: {result.error_message}")
                    source.failure_count += 1
                    source.last_error = result.error_message
                    await self.db.commit()
                    return []
                    
        except Exception as e:
            logger.error(f"Error scraping {source.source_url}: {e}")
            source.failure_count += 1
            source.last_error = str(e)
            await self.db.commit()
            return []
    
    async def scrape_all_fd_rates(self) -> Dict[str, Any]:
        """
        Scrape FD rates from all active sources.
        """
        # Get all active FD sources
        result = await self.db.execute(
            select(DataSource).where(
                DataSource.source_type == "fd_rates",
                DataSource.is_active == True
            )
        )
        sources = result.scalars().all()
        
        all_rates = []
        for source in sources:
            rates = await self.scrape_fd_rates(source)
            for rate in rates:
                rate["bank_name"] = source.source_name
                rate["bank_type"] = source.scraper_config.get("bank_type", "unknown")
                rate["source_url"] = source.source_url
            all_rates.extend(rates)
        
        # Store in database
        await self._store_fd_rates(all_rates)
        
        return {
            "total_sources": len(sources),
            "total_rates_found": len(all_rates),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _store_fd_rates(self, rates: List[Dict[str, Any]]):
        """Store scraped FD rates in database."""
        for rate_data in rates:
            fd_rate = FixedDepositRate(
                bank_name=rate_data.get("bank_name", "Unknown"),
                bank_type=rate_data.get("bank_type", "unknown"),
                tenure_min_days=rate_data.get("tenure_days_min", 0),
                tenure_max_days=rate_data.get("tenure_days_max", 0),
                tenure_display=rate_data.get("tenure", ""),
                interest_rate_general=rate_data.get("interest_rate_general", 0),
                interest_rate_senior=rate_data.get("interest_rate_senior"),
                min_amount=rate_data.get("min_amount"),
                special_features=rate_data.get("special_features"),
                source_url=rate_data.get("source_url", ""),
                has_credit_card_offer="credit card" in str(rate_data.get("special_features", [])).lower()
            )
            self.db.add(fd_rate)
        
        await self.db.commit()
    
    async def get_best_fd_rates(
        self,
        tenure_days: Optional[int] = None,
        min_rate: Optional[float] = None,
        bank_types: Optional[List[str]] = None,
        with_credit_card: bool = False
    ) -> List[FixedDepositRate]:
        """
        Get best FD rates based on criteria.
        """
        query = select(FixedDepositRate).order_by(FixedDepositRate.interest_rate_general.desc())
        
        if tenure_days:
            query = query.where(
                FixedDepositRate.tenure_min_days <= tenure_days,
                FixedDepositRate.tenure_max_days >= tenure_days
            )
        
        if min_rate:
            query = query.where(FixedDepositRate.interest_rate_general >= min_rate)
        
        if bank_types:
            query = query.where(FixedDepositRate.bank_type.in_(bank_types))
        
        if with_credit_card:
            query = query.where(FixedDepositRate.has_credit_card_offer == True)
        
        result = await self.db.execute(query.limit(20))
        return result.scalars().all()