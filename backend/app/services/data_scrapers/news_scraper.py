"""
News scraper with LLM-powered planning and robust extraction.
Uses CrewAI for orchestrated multi-source scraping.
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.services.ai_engine.openrouter_client import OpenRouterClient
from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# KNOWN NEWS SOURCES (Pre-seeded, not discovered at runtime)
# ============================================================================

INDIA_FINANCIAL_NEWS_SOURCES = [
    {
        "name": "Moneycontrol Markets",
        "url": "https://www.moneycontrol.com/news/business/markets/",
        "categories": ["equity", "markets"],
        "priority": 1,
    },
    {
        "name": "Economic Times Markets",
        "url": "https://economictimes.indiatimes.com/markets",
        "categories": ["equity", "markets"],
        "priority": 1,
    },
    {
        "name": "LiveMint Money",
        "url": "https://www.livemint.com/money",
        "categories": ["personal_finance", "markets"],
        "priority": 2,
    },
    {
        "name": "RBI Press Releases",
        "url": "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
        "categories": ["rbi", "policy"],
        "priority": 1,
    },
    {
        "name": "Business Standard Markets",
        "url": "https://www.business-standard.com/markets",
        "categories": ["equity", "markets"],
        "priority": 2,
    },
    {
        "name": "NDTV Profit",
        "url": "https://www.ndtvprofit.com/markets",
        "categories": ["equity", "markets"],
        "priority": 3,
    },
    {
        "name": "Value Research",
        "url": "https://www.valueresearchonline.com/stories/",
        "categories": ["mutual_funds", "personal_finance"],
        "priority": 2,
    },
]


class NewsItem(BaseModel):
    """Structured news item extracted by LLM."""
    title: str = Field(..., description="News headline")
    url: str = Field(..., description="Full article URL")
    summary: Optional[str] = Field(None, description="Brief summary if available")
    published_date: Optional[str] = Field(None, description="Publication date")
    relevance_tags: List[str] = Field(default_factory=list, description="Relevant categories")


class NewsExtractionResult(BaseModel):
    """LLM extraction result."""
    news_items: List[NewsItem] = Field(default_factory=list)
    extraction_confidence: float = Field(0.0, ge=0, le=1)
    source_name: str = ""


class IntelligentNewsScraper:
    """
    Scrapes financial news using LLM for intelligent extraction.
    
    Key principles:
    - Uses pre-seeded known sources (no URL hallucination)
    - LLM extracts and structures content (no brittle regex)
    - Fails gracefully - missing source doesn't break the app
    - Prioritizes sources by reliability
    """
    
    def __init__(self):
        self.ai_client = OpenRouterClient()
        self.sources = INDIA_FINANCIAL_NEWS_SOURCES
    
    async def scrape_all_sources(
        self, 
        max_sources: int = 5,
        max_items_per_source: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Scrape news from all sources, prioritized by reliability.
        
        Args:
            max_sources: Maximum sources to scrape (for cost control)
            max_items_per_source: Max news items per source
            
        Returns:
            List of structured news items
        """
        # Sort by priority and take top sources
        sorted_sources = sorted(self.sources, key=lambda x: x["priority"])[:max_sources]
        
        all_news = []
        tasks = []
        
        for source in sorted_sources:
            task = self._scrape_single_source(source, max_items_per_source)
            tasks.append(task)
        
        # Run concurrently with timeout
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"Failed to scrape {sorted_sources[i]['name']}: {result}")
                continue
            all_news.extend(result)
        
        # Deduplicate by URL
        seen_urls = set()
        unique_news = []
        for item in all_news:
            if item.get("url") not in seen_urls:
                seen_urls.add(item["url"])
                unique_news.append(item)
        
        logger.info(f"Scraped {len(unique_news)} unique news items from {len(sorted_sources)} sources")
        return unique_news
    
    async def _scrape_single_source(
        self, 
        source: Dict[str, Any],
        max_items: int
    ) -> List[Dict[str, Any]]:
        """Scrape a single news source using LLM extraction."""
        browser_config = BrowserConfig(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            wait_for="networkidle",
            page_timeout=30000
        )
        
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(url=source["url"], config=crawler_config)
                
                if not result.success:
                    logger.warning(f"Crawl failed for {source['name']}: {result.error_message}")
                    return []
                
                # Use LLM to extract news items (no regex!)
                news_items = await self._extract_news_with_llm(
                    page_content=result.markdown or result.html or "",
                    source=source,
                    max_items=max_items
                )
                
                return news_items
                
        except Exception as e:
            logger.error(f"Error scraping {source['name']}: {e}")
            return []
    
    async def _extract_news_with_llm(
        self,
        page_content: str,
        source: Dict[str, Any],
        max_items: int
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to intelligently extract news from page content.
        This is robust to HTML changes because LLM understands semantics.
        """
        # Truncate content to avoid token limits
        content_preview = page_content[:12000]
        
        extraction_prompt = f"""
You are extracting financial news from an Indian news website.

SOURCE: {source['name']}
BASE URL: {source['url']}
EXPECTED CATEGORIES: {', '.join(source['categories'])}

PAGE CONTENT:
{content_preview}

TASK: Extract the {max_items} most recent and relevant financial news headlines.

For each news item, provide:
1. title: The exact headline text
2. url: The full article URL (convert relative URLs to absolute using base URL)
3. summary: A 1-sentence summary if visible on the page, otherwise null
4. published_date: Publication date if visible (ISO format), otherwise null
5. relevance_tags: Categories from [gold, silver, rbi, inflation, equity, debt, tax, mutual_funds, fd, markets, policy]

IMPORTANT:
- Only extract ACTUAL headlines from the page, do not make up news
- Skip advertisements, sponsored content, and non-news items
- Prefer recent news (today/yesterday) over older content
- If you cannot find news items, return an empty array

Return as JSON:
{{
    "news_items": [...],
    "extraction_confidence": 0.0-1.0
}}
"""
        
        try:
            response = await self.ai_client.complete(
                prompt=extraction_prompt,
                model=settings.FAST_MODEL,  # Use fast model for extraction
                response_format={"type": "json_object"},
                temperature=0.1  # Low temperature for factual extraction
            )
            
            import json
            result = json.loads(response)
            items = result.get("news_items", [])
            confidence = result.get("extraction_confidence", 0.5)
            
            if confidence < 0.3:
                logger.warning(f"Low extraction confidence ({confidence}) for {source['name']}")
            
            # Add source metadata
            for item in items:
                item["source"] = source["name"]
                item["source_url"] = source["url"]
                item["scraped_at"] = datetime.utcnow().isoformat()
                
                # Merge source categories with extracted tags
                existing_tags = set(item.get("relevance_tags", []))
                existing_tags.update(source["categories"])
                item["relevance_tags"] = list(existing_tags)
            
            return items
            
        except Exception as e:
            logger.error(f"LLM extraction failed for {source['name']}: {e}")
            return []
    
    async def analyze_news_sentiment(
        self,
        news_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Batch analyze sentiment of news items.
        Separate from extraction to allow caching and reprocessing.
        """
        if not news_items:
            return []
        
        # Batch for efficiency
        batch_size = 20
        analyzed = []
        
        for i in range(0, len(news_items), batch_size):
            batch = news_items[i:i + batch_size]
            batch_analyzed = await self._analyze_batch_sentiment(batch)
            analyzed.extend(batch_analyzed)
        
        return analyzed
    
    async def _analyze_batch_sentiment(
        self,
        news_batch: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze sentiment for a batch of news items."""
        headlines = [
            {"idx": i, "title": n.get("title", ""), "summary": n.get("summary", "")}
            for i, n in enumerate(news_batch)
        ]
        
        prompt = f"""
Analyze the sentiment of these Indian financial news headlines for a passive investor.

Headlines:
{headlines}

For each headline, provide:
- idx: The original index
- sentiment: "bullish", "bearish", or "neutral"
- sentiment_score: -1.0 (very bearish) to 1.0 (very bullish)
- investor_relevance: 0.0 (irrelevant) to 1.0 (highly relevant for monthly investment decisions)
- key_insight: One sentence about what this means for a passive investor (or null if not relevant)

Consider:
- RBI rate changes affect FD and debt fund decisions
- Gold/silver news affects commodity allocation
- Inflation news affects real return calculations
- Market volatility news may affect equity timing

Return as JSON array.
"""
        
        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                model=settings.FAST_MODEL,
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            import json
            result = json.loads(response)
            analysis_list = result if isinstance(result, list) else result.get("items", [])
            
            # Merge analysis back
            analysis_map = {a.get("idx"): a for a in analysis_list}
            
            for i, news in enumerate(news_batch):
                if i in analysis_map:
                    analysis = analysis_map[i]
                    news["sentiment"] = analysis.get("sentiment", "neutral")
                    news["sentiment_score"] = analysis.get("sentiment_score", 0)
                    news["investor_relevance"] = analysis.get("investor_relevance", 0.5)
                    news["key_insight"] = analysis.get("key_insight")
            
            return news_batch
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            # Return items without sentiment rather than failing
            return news_batch


# ============================================================================
# CrewAI Integration (Optional, for complex multi-step research)
# ============================================================================

class NewsResearchCrew:
    """
    CrewAI-based news research for deeper analysis.
    Use this for weekly digest generation, not real-time scraping.
    """
    
    async def generate_weekly_digest(
        self,
        news_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate a weekly investment digest from collected news.
        Uses LLM to synthesize insights.
        """
        ai_client = OpenRouterClient()
        
        # Group news by category
        by_category = {}
        for item in news_items:
            for tag in item.get("relevance_tags", ["general"]):
                if tag not in by_category:
                    by_category[tag] = []
                by_category[tag].append(item)
        
        prompt = f"""
You are creating a weekly investment digest for Indian passive investors using Zrata-X.

News grouped by category:
{by_category}

Generate a calm, actionable digest with:

1. MACRO SUMMARY (2-3 sentences)
   - Key economic developments
   - What changed this week

2. ASSET CLASS SIGNALS (for each relevant class)
   - EQUITY: Any significant market movements or outlook changes
   - DEBT/FD: Interest rate changes, RBI signals
   - GOLD/SILVER: Price movements, demand signals
   
3. ACTIONABLE INSIGHTS (for monthly investment decisions)
   - What should a passive investor consider this month?
   - Any special opportunities (high FD rates, discounts, etc.)?

4. WHAT TO IGNORE
   - Short-term noise that passive investors should tune out

Keep it calm and focused on monthly decisions, not daily trading.
Return as JSON with keys: macro_summary, asset_signals, actionable_insights, ignore_list
"""
        
        try:
            response = await ai_client.complete(
                prompt=prompt,
                model=settings.PRIMARY_MODEL,  # Use primary model for synthesis
                response_format={"type": "json_object"},
                temperature=0.4
            )
            
            import json
            return json.loads(response)
            
        except Exception as e:
            logger.error(f"Weekly digest generation failed: {e}")
            return {"error": str(e)}