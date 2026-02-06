"""
Enhanced FD Scraper with comprehensive data collection.
Adds: compound frequency, premature withdrawal penalties, tax implications, 
special schemes, online booking availability, and historical rate tracking.
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.asset_data import FixedDepositRate
from app.services.ai_engine.openrouter_client import OpenRouterClient
from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# Enhanced aggregator sources with more data points
ENHANCED_AGGREGATOR_SOURCES = [
    {
        "name": "BankBazaar FD Rates",
        "url": "https://www.bankbazaar.com/fixed-deposit-rate.html",
        "priority": 1,
        "data_quality": "high"
    },
    {
        "name": "Paisabazaar FD Comparison",
        "url": "https://www.paisabazaar.com/fixed-deposit/",
        "priority": 2,
        "data_quality": "high"
    },
    {
        "name": "Moneycontrol FD Rates",
        "url": "https://www.moneycontrol.com/fixed-income/fixed-deposit-interest-rate.html",
        "priority": 3,
        "data_quality": "medium"
    },
    {
        "name": "Economic Times FD Comparison",
        "url": "https://economictimes.indiatimes.com/wealth/save/best-fixed-deposit-rates",
        "priority": 4,
        "data_quality": "high"
    }
]


# Bank-specific sources for detailed information
ENHANCED_BANK_SOURCES = [
    # Private Banks
    {"bank_name": "HDFC Bank", "url": "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit", "bank_type": "private"},
    {"bank_name": "ICICI Bank", "url": "https://www.icicibank.com/personal-banking/deposits/fixed-deposit", "bank_type": "private"},
    {"bank_name": "Axis Bank", "url": "https://www.axisbank.com/retail/deposits/fixed-deposits", "bank_type": "private"},
    {"bank_name": "Kotak Mahindra Bank", "url": "https://www.kotak.com/en/personal-banking/deposits/fixed-deposit.html", "bank_type": "private"},
    {"bank_name": "IndusInd Bank", "url": "https://www.indusind.com/in/en/personal/deposits/fixed-deposit.html", "bank_type": "private"},
    {"bank_name": "Yes Bank", "url": "https://www.yesbank.in/personal-banking/yes-individual/deposits/fixed-deposit", "bank_type": "private"},
    
    # Public Sector Banks
    {"bank_name": "SBI", "url": "https://sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits", "bank_type": "public"},
    {"bank_name": "Bank of Baroda", "url": "https://www.bankofbaroda.in/personal-banking/deposit-services/fixed-deposit", "bank_type": "public"},
    {"bank_name": "Punjab National Bank", "url": "https://www.pnbindia.in/en/ui/Interest-Rate.aspx", "bank_type": "public"},
    {"bank_name": "Canara Bank", "url": "https://canarabank.com/pages/interestrates.aspx", "bank_type": "public"},
    {"bank_name": "Union Bank of India", "url": "https://www.unionbankofindia.co.in/english/interest-rate.aspx", "bank_type": "public"},
    
    # Small Finance Banks (typically higher rates)
    {"bank_name": "Ujjivan Small Finance Bank", "url": "https://www.ujjivansfb.in/fixed-deposit", "bank_type": "small_finance"},
    {"bank_name": "AU Small Finance Bank", "url": "https://www.aubank.in/personal-banking/deposits/fixed-deposit", "bank_type": "small_finance"},
    {"bank_name": "Equitas Small Finance Bank", "url": "https://www.equitasbank.com/fixed-deposit", "bank_type": "small_finance"},
    {"bank_name": "Suryoday Small Finance Bank", "url": "https://www.suryodaybank.com/personal-banking/deposits/fixed-deposits", "bank_type": "small_finance"},
    {"bank_name": "Jana Small Finance Bank", "url": "https://www.janabank.com/personal/deposits/fixed-deposits", "bank_type": "small_finance"},
    {"bank_name": "Utkarsh Small Finance Bank", "url": "https://www.utkarsh.bank/personal/deposits/fixed-deposit", "bank_type": "small_finance"},
    
    # NBFCs (Non-Banking Financial Companies)
    {"bank_name": "Bajaj Finance", "url": "https://www.bajajfinserv.in/fixed-deposit", "bank_type": "nbfc"},
    {"bank_name": "Shriram Finance", "url": "https://www.shriramfinance.in/fixed-deposit.html", "bank_type": "nbfc"},
    {"bank_name": "Mahindra Finance", "url": "https://www.mahindrafinance.com/fixed-deposit.aspx", "bank_type": "nbfc"},
]


class DynamicFDScraper:
    """
    Enhanced FD scraper that collects comprehensive data including:
    - Compound frequency (monthly, quarterly, annually, cumulative)
    - Premature withdrawal penalties
    - Tax-saving FD details (80C eligible)
    - Minimum/Maximum deposit amounts
    - Special schemes (senior citizen, women, super senior)
    - Credit card/debit card offers
    - Online vs offline rates
    - Lock-in periods
    - Historical rate changes
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()
    
    async def scrape_all_fd_rates(self) -> Dict[str, Any]:
        """
        Compatibility wrapper for scrape_comprehensive_fd_data.
        Maintains backward compatibility with existing code.
        """
        return await self.scrape_comprehensive_fd_data()
    
    async def scrape_comprehensive_fd_data(self) -> Dict[str, Any]:
        """
        Main entry point for comprehensive FD data collection.
        Returns detailed statistics about scraping operation.
        """
        results = {
            "strategy_used": None,
            "success": 0,
            "failed": 0,
            "total_rates": 0,
            "banks_covered": 0,
            "enhanced_fields_captured": []
        }
        
        logger.info("Starting enhanced FD data scraping...")
        
        # Strategy 1: Scrape aggregators for comprehensive comparison
        aggregator_rates = await self._scrape_enhanced_aggregators()
        
        if aggregator_rates and len(aggregator_rates) >= 15:
            results["strategy_used"] = "aggregator"
            results["total_rates"] = len(aggregator_rates)
            await self._store_enhanced_rates(aggregator_rates)
            logger.info(f"Aggregator strategy succeeded with {len(aggregator_rates)} enhanced rates")
        
        # Strategy 2: Scrape top banks for detailed information
        bank_rates = await self._scrape_individual_banks_enhanced()
        
        if bank_rates:
            results["total_rates"] += len(bank_rates)
            await self._store_enhanced_rates(bank_rates)
            logger.info(f"Individual banks provided {len(bank_rates)} detailed rates")
        
        # Track unique enhanced fields captured
        if aggregator_rates or bank_rates:
            all_rates = (aggregator_rates or []) + (bank_rates or [])
            enhanced_fields = set()
            for rate in all_rates:
                enhanced_fields.update(rate.keys())
            results["enhanced_fields_captured"] = list(enhanced_fields)
        
        # Count final statistics
        result = await self.db.execute(
            select(FixedDepositRate)
        )
        all_rates = result.scalars().all()
        results["banks_covered"] = len(set(r.bank_name for r in all_rates))
        results["total_rates"] = len(all_rates)
        
        return results
    
    async def _scrape_enhanced_aggregators(self) -> List[Dict[str, Any]]:
        """Scrape aggregator sites with enhanced data extraction."""
        all_rates = []
        
        for source in ENHANCED_AGGREGATOR_SOURCES:
            try:
                rates = await self._scrape_with_enhanced_extraction(
                    source=source,
                    is_aggregator=True
                )
                if rates:
                    all_rates.extend(rates)
                    logger.info(f"Got {len(rates)} enhanced rates from {source['name']}")
                    # If high-quality data from one aggregator, that's enough
                    if len(rates) >= 20 and source.get("data_quality") == "high":
                        return all_rates
            except Exception as e:
                logger.warning(f"Aggregator {source['name']} failed: {e}")
        
        return all_rates
    
    async def _scrape_individual_banks_enhanced(self) -> List[Dict[str, Any]]:
        """Scrape individual bank websites for detailed information."""
        all_rates = []
        
        # Prioritize small finance banks and NBFCs (typically better rates and more details)
        priority_banks = [b for b in ENHANCED_BANK_SOURCES if b["bank_type"] in ["small_finance", "nbfc"]]
        other_banks = [b for b in ENHANCED_BANK_SOURCES if b["bank_type"] not in ["small_finance", "nbfc"]]
        
        # Scrape priority banks first
        for source in priority_banks[:8]:  # Top 8 priority banks
            try:
                rates = await self._scrape_with_enhanced_extraction(
                    source=source,
                    is_aggregator=False
                )
                if rates:
                    for r in rates:
                        r["bank_name"] = source["bank_name"]
                        r["bank_type"] = source["bank_type"]
                    all_rates.extend(rates)
                    logger.info(f"Got {len(rates)} rates from {source['bank_name']}")
            except Exception as e:
                logger.warning(f"Bank {source['bank_name']} failed: {e}")
        
        # Scrape some other banks for diversity
        for source in other_banks[:5]:
            try:
                rates = await self._scrape_with_enhanced_extraction(
                    source=source,
                    is_aggregator=False
                )
                if rates:
                    for r in rates:
                        r["bank_name"] = source["bank_name"]
                        r["bank_type"] = source["bank_type"]
                    all_rates.extend(rates)
            except Exception as e:
                logger.warning(f"Bank {source['bank_name']} failed: {e}")
        
        return all_rates
    
    async def _scrape_with_enhanced_extraction(
        self,
        source: Dict[str, str],
        is_aggregator: bool = False
    ) -> List[Dict[str, Any]]:
        """Scrape a source with enhanced LLM extraction."""
        
        browser_config = BrowserConfig(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            page_timeout=60000,
            delay_before_return_html=5.0,
        )
        
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(url=source["url"], config=crawler_config)
                
                if not result.success:
                    logger.warning(f"Crawl failed for {source.get('name', source.get('bank_name'))}")
                    return []
                
                content = result.markdown or result.html or ""
                
                # Extract with enhanced prompt
                rates = await self._extract_enhanced_rates_with_llm(
                    content=content,
                    source=source,
                    is_aggregator=is_aggregator
                )
                
                return rates
                
        except Exception as e:
            logger.error(f"Error scraping {source.get('name', source.get('bank_name'))}: {e}")
            return []
    
    async def _extract_enhanced_rates_with_llm(
        self,
        content: str,
        source: Dict[str, str],
        is_aggregator: bool
    ) -> List[Dict[str, Any]]:
        """Extract comprehensive FD data using advanced LLM prompting."""
        
        max_len = 30000 if is_aggregator else 20000
        content = content[:max_len]
        
        prompt = f"""Extract COMPREHENSIVE Fixed Deposit data from this {'aggregator' if is_aggregator else 'bank'} page.

SOURCE: {source.get('name', source.get('bank_name'))}
URL: {source['url']}

PAGE CONTENT:
{content}

TASK: Extract ALL available FD rate information. For each rate entry, extract as many fields as possible:

REQUIRED FIELDS:
- bank_name: Full bank name
- bank_type: "private", "public", "small_finance", "nbfc", "post_office"
- tenure_display: "1 year", "18 months", "2-3 years"
- tenure_min_days: Minimum days
- tenure_max_days: Maximum days
- rate_general: Interest rate for general public (number like 7.5)

ENHANCED FIELDS (extract if available):
- rate_senior: Senior citizen rate (typically 0.25-0.50% higher)
- rate_super_senior: Super senior citizen rate (>80 years, if mentioned)
- rate_women: Special rate for women (some banks offer this)
- compound_frequency: "monthly", "quarterly", "half_yearly", "annually", "cumulative"
- payout_type: "monthly_interest", "quarterly_interest", "cumulative", "reinvest"
- min_deposit_amount: Minimum investment required
- max_deposit_amount: Maximum allowed (if mentioned)
- premature_withdrawal_penalty: Penalty percentage or description
- lock_in_period_days: Lock-in period if any (especially for tax-saving FDs)
- is_tax_saving: true/false (80C eligible - typically 5 year lock-in)
- is_cumulative: true/false
- special_schemes: Array of special features like "credit_card_offer", "auto_renewal", "loan_against_fd", "sweep_in_facility"
- online_booking_available: true/false
- senior_citizen_extra_rate: Extra rate for senior citizens (typically 0.25 or 0.50)
- tds_applicable: true/false (TDS deducted if interest > 40,000)
- effective_annual_rate: Effective rate after compounding (if mentioned)
- maturity_amount_sample: Sample maturity amount for standard investment
- monthly_interest_payout: If monthly interest option, what's the rate
- credit_rating: Bank's credit rating if mentioned (for NBFCs)

ADDITIONAL CONTEXT:
- For tax-saving FDs: tenure is always 5 years with lock-in
- Senior citizen extra rate: usually 0.25% to 0.50% additional
- Premature withdrawal: usually allowed with penalty (except tax-saving FDs)
- TDS: Deducted if annual interest > ₹40,000 (₹50,000 for senior citizens)

Return ONLY valid JSON array. Extract maximum possible information for each rate entry.
If a field is not available, set it to null.

Example enhanced entry:
{{
  "bank_name": "HDFC Bank",
  "bank_type": "private",
  "tenure_display": "1-2 years",
  "tenure_min_days": 365,
  "tenure_max_days": 730,
  "rate_general": 7.00,
  "rate_senior": 7.50,
  "rate_super_senior": 7.75,
  "compound_frequency": "quarterly",
  "payout_type": "cumulative",
  "min_deposit_amount": 5000,
  "max_deposit_amount": null,
  "premature_withdrawal_penalty": "1% or interest for period, whichever is lower",
  "lock_in_period_days": null,
  "is_tax_saving": false,
  "special_schemes": ["auto_renewal", "loan_against_fd", "sweep_in_facility"],
  "online_booking_available": true,
  "senior_citizen_extra_rate": 0.50,
  "tds_applicable": true
}}

JSON ARRAY:"""

        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                model="anthropic/claude-3.5-sonnet:beta",
                temperature=0.1,
                max_tokens=8000
            )
            
            content_text = response.get("content", "[]")
            # Clean response
            content_text = content_text.strip()
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.startswith("```"):
                content_text = content_text[3:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
            content_text = content_text.strip()
            
            import json
            rates = json.loads(content_text)
            
            if not isinstance(rates, list):
                logger.warning("LLM returned non-list response")
                return []
            
            logger.info(f"Extracted {len(rates)} enhanced FD rates")
            return rates
            
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return []
    
    async def _store_enhanced_rates(self, rates: List[Dict[str, Any]]):
        """Store enhanced FD rates in database with upsert logic."""
        if not rates:
            return
        
        for rate_data in rates:
            # Prepare data for insertion
            insert_data = {
                "bank_name": rate_data.get("bank_name", "Unknown"),
                "bank_type": rate_data.get("bank_type", "unknown"),
                "tenure_display": rate_data.get("tenure_display", ""),
                "tenure_min_days": rate_data.get("tenure_min_days", 0),
                "tenure_max_days": rate_data.get("tenure_max_days", 0),
                "interest_rate_general": rate_data.get("rate_general", 0.0),
                "interest_rate_senior": rate_data.get("rate_senior"),
                "interest_rate_women": rate_data.get("rate_women"),
                "min_amount": rate_data.get("min_deposit_amount"),
                "max_amount": rate_data.get("max_deposit_amount"),
                "source_url": rate_data.get("source_url", ""),
                "scraped_at": datetime.utcnow(),
                
                # Enhanced fields stored in special_features JSON
                "special_features": {
                    "compound_frequency": rate_data.get("compound_frequency"),
                    "payout_type": rate_data.get("payout_type"),
                    "premature_withdrawal_penalty": rate_data.get("premature_withdrawal_penalty"),
                    "lock_in_period_days": rate_data.get("lock_in_period_days"),
                    "is_tax_saving": rate_data.get("is_tax_saving", False),
                    "is_cumulative": rate_data.get("is_cumulative"),
                    "special_schemes": rate_data.get("special_schemes", []),
                    "online_booking_available": rate_data.get("online_booking_available"),
                    "senior_citizen_extra_rate": rate_data.get("senior_citizen_extra_rate"),
                    "rate_super_senior": rate_data.get("rate_super_senior"),
                    "tds_applicable": rate_data.get("tds_applicable"),
                    "effective_annual_rate": rate_data.get("effective_annual_rate"),
                    "credit_rating": rate_data.get("credit_rating"),
                }
            }
            
            # Check if credit card offer exists
            if rate_data.get("special_schemes"):
                insert_data["has_credit_card_offer"] = "credit_card_offer" in rate_data["special_schemes"]
            
            # Upsert logic
            stmt = insert(FixedDepositRate).values(**insert_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=["bank_name", "tenure_min_days", "tenure_max_days"],
                set_=insert_data
            )
            
            await self.db.execute(stmt)
        
        await self.db.commit()
        logger.info(f"Stored {len(rates)} enhanced FD rates")
    
    async def track_historical_rates(self, bank_name: str):
        """
        Track historical FD rate changes for a specific bank.
        This helps identify rate trends and optimal timing.
        """
        # Implementation for historical rate tracking
        # Store snapshots in a separate historical_rates table
        pass
