"""
Comprehensive financial news scraping and analysis.
Covers markets, macro, geopolitics, and policy for AI-driven investment insights.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.config import get_settings
from app.models.asset_data import MarketNews
from app.services.ai_engine.openrouter_client import OpenRouterClient
from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# COMPREHENSIVE NEWS SOURCES
# Organized by category for better AI context
# =============================================================================

NEWS_SOURCES = [
    # -------------------------------------------------------------------------
    # INDIAN MARKET NEWS (Primary)
    # -------------------------------------------------------------------------
    {
        "name": "Moneycontrol Markets",
        "url": "https://www.moneycontrol.com/news/business/markets/",
        "categories": ["markets", "equity", "india"],
        "priority": 1,
    },
    {
        "name": "Economic Times Markets",
        "url": "https://economictimes.indiatimes.com/markets/stocks/news",
        "categories": ["markets", "equity", "india"],
        "priority": 1,
    },
    {
        "name": "Business Standard Markets",
        "url": "https://www.business-standard.com/markets",
        "categories": ["markets", "equity", "india"],
        "priority": 2,
    },
    {
        "name": "LiveMint Money",
        "url": "https://www.livemint.com/market/stock-market-news",
        "categories": ["markets", "equity", "india"],
        "priority": 2,
    },
    
    # -------------------------------------------------------------------------
    # MUTUAL FUNDS & PERSONAL FINANCE
    # -------------------------------------------------------------------------
    {
        "name": "Value Research",
        "url": "https://www.valueresearchonline.com/stories/",
        "categories": ["mutual_funds", "personal_finance", "india"],
        "priority": 1,
    },
    {
        "name": "ET Mutual Funds",
        "url": "https://economictimes.indiatimes.com/mf/mf-news",
        "categories": ["mutual_funds", "india"],
        "priority": 2,
    },
    {
        "name": "Moneycontrol MF",
        "url": "https://www.moneycontrol.com/news/business/mutual-funds/",
        "categories": ["mutual_funds", "india"],
        "priority": 2,
    },
    
    # -------------------------------------------------------------------------
    # RBI & MONETARY POLICY
    # -------------------------------------------------------------------------
    {
        "name": "RBI Press Releases",
        "url": "https://www.rbi.org.in/commonman/english/scripts/PressReleases.aspx",
        "categories": ["rbi", "policy", "interest_rates", "india"],
        "priority": 1,
    },
    {
        "name": "ET Economy",
        "url": "https://economictimes.indiatimes.com/news/economy",
        "categories": ["economy", "policy", "inflation", "india"],
        "priority": 1,
    },
    
    # -------------------------------------------------------------------------
    # GOLD & COMMODITIES
    # -------------------------------------------------------------------------
    {
        "name": "Moneycontrol Commodities",
        "url": "https://www.moneycontrol.com/news/business/commodities/",
        "categories": ["gold", "silver", "commodities", "india"],
        "priority": 1,
    },
    {
        "name": "ET Commodities",
        "url": "https://economictimes.indiatimes.com/markets/commodities",
        "categories": ["gold", "silver", "commodities"],
        "priority": 2,
    },
    
    # -------------------------------------------------------------------------
    # FIXED DEPOSITS & DEBT
    # -------------------------------------------------------------------------
    {
        "name": "ET Personal Finance",
        "url": "https://economictimes.indiatimes.com/wealth/invest",
        "categories": ["fd", "debt", "personal_finance", "india"],
        "priority": 2,
    },
    
    # -------------------------------------------------------------------------
    # GLOBAL MARKETS (affects India)
    # -------------------------------------------------------------------------
    {
        "name": "Reuters Business",
        "url": "https://www.reuters.com/business/",
        "categories": ["global", "markets", "geopolitics"],
        "priority": 1,
    },
    {
        "name": "Bloomberg Markets",
        "url": "https://www.bloomberg.com/markets",
        "categories": ["global", "markets", "economy"],
        "priority": 1,
    },
    
    # -------------------------------------------------------------------------
    # GEOPOLITICS & MACRO (impacts investment climate)
    # -------------------------------------------------------------------------
    {
        "name": "Reuters World",
        "url": "https://www.reuters.com/world/",
        "categories": ["geopolitics", "global", "macro"],
        "priority": 2,
    },
    {
        "name": "ET International",
        "url": "https://economictimes.indiatimes.com/news/international",
        "categories": ["geopolitics", "global"],
        "priority": 3,
    },
    
    # -------------------------------------------------------------------------
    # US FED & GLOBAL CENTRAL BANKS (affects India rates)
    # -------------------------------------------------------------------------
    {
        "name": "Reuters Central Banks",
        "url": "https://www.reuters.com/markets/rates-bonds/",
        "categories": ["fed", "interest_rates", "global", "bonds"],
        "priority": 1,
    },
]


# RSS Feeds as fallback (more reliable than scraping)
RSS_FEEDS = [
    {
        "name": "ET Markets RSS",
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "categories": ["markets", "india"],
    },
    {
        "name": "Moneycontrol RSS",
        "url": "https://www.moneycontrol.com/rss/MCtopnews.xml",
        "categories": ["markets", "india"],
    },
    {
        "name": "LiveMint RSS",
        "url": "https://www.livemint.com/rss/markets",
        "categories": ["markets", "india"],
    },
]


class NewsService:
    """
    Comprehensive news scraper with multiple fallback strategies.
    
    Strategy:
    1. Try RSS feeds first (fast, reliable)
    2. Scrape websites with Crawl4AI (more content)
    3. Use LLM to extract and categorize
    4. Analyze sentiment and investment relevance
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.http_client.aclose()
    
    async def fetch_and_analyze_news(self) -> Dict[str, Any]:
        """
        Main entry point - fetch news from all sources.
        """
        results = {
            "rss_news": 0,
            "scraped_news": 0,
            "total_stored": 0,
            "sources_tried": 0,
            "sources_succeeded": 0,
            "errors": []
        }
        
        all_news = []
        
        # Strategy 1: RSS Feeds (fast and reliable)
        logger.info("Fetching RSS feeds...")
        for feed in RSS_FEEDS:
            try:
                items = await self._fetch_rss_feed(feed)
                all_news.extend(items)
                results["rss_news"] += len(items)
                results["sources_succeeded"] += 1
            except Exception as e:
                logger.warning(f"RSS feed failed {feed['name']}: {e}")
            results["sources_tried"] += 1
        
        # Strategy 2: Web scraping (for richer content)
        logger.info("Scraping news websites...")
        
        # Only scrape priority 1 sources to avoid timeouts
        priority_sources = [s for s in NEWS_SOURCES if s.get("priority", 3) == 1]
        
        for source in priority_sources:
            try:
                items = await self._scrape_news_source(source)
                all_news.extend(items)
                results["scraped_news"] += len(items)
                results["sources_succeeded"] += 1
            except Exception as e:
                logger.warning(f"Scrape failed {source['name']}: {e}")
                results["errors"].append(f"{source['name']}: {str(e)[:100]}")
            results["sources_tried"] += 1
        
        # Deduplicate by title similarity
        unique_news = self._deduplicate_news(all_news)
        logger.info(f"Collected {len(all_news)} items, {len(unique_news)} unique")
        
        # Analyze sentiment and relevance
        if unique_news:
            logger.info("Analyzing news sentiment and relevance...")
            analyzed_news = await self._analyze_news_batch(unique_news)
            
            # Store in database
            stored = await self._store_news(analyzed_news)
            results["total_stored"] = stored
        
        return results
    
    async def _fetch_rss_feed(self, feed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch and parse RSS feed."""
        try:
            response = await self.http_client.get(
                feed["url"],
                headers={"User-Agent": "Mozilla/5.0 Zrata-X/1.0"}
            )
            
            if response.status_code != 200:
                return []
            
            # Simple XML parsing for RSS
            content = response.text
            items = []
            
            # Extract items using basic parsing (avoid heavy XML libs)
            import re
            
            item_pattern = re.compile(r'<item>(.*?)</item>', re.DOTALL)
            title_pattern = re.compile(r'<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>')
            link_pattern = re.compile(r'<link>(.*?)</link>')
            desc_pattern = re.compile(r'<description><!\[CDATA\[(.*?)\]\]></description>|<description>(.*?)</description>')
            date_pattern = re.compile(r'<pubDate>(.*?)</pubDate>')
            
            for item_match in item_pattern.finditer(content):
                item_content = item_match.group(1)
                
                title_match = title_pattern.search(item_content)
                link_match = link_pattern.search(item_content)
                desc_match = desc_pattern.search(item_content)
                date_match = date_pattern.search(item_content)
                
                if title_match and link_match:
                    title = title_match.group(1) or title_match.group(2) or ""
                    title = re.sub(r'<[^>]+>', '', title).strip()
                    
                    items.append({
                        "title": title[:500],
                        "url": link_match.group(1).strip(),
                        "summary": (desc_match.group(1) or desc_match.group(2) or "")[:500] if desc_match else None,
                        "published_at": date_match.group(1) if date_match else None,
                        "source": feed["name"],
                        "categories": feed["categories"],
                    })
            
            return items[:15]  # Limit per feed
            
        except Exception as e:
            logger.warning(f"RSS parsing failed for {feed['name']}: {e}")
            return []
    
    async def _scrape_news_source(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scrape news from website using Crawl4AI."""
        browser_config = BrowserConfig(
            headless=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport_width=1920,
            viewport_height=1080,
        )
        
        # DON'T use networkidle - it times out on heavy sites
        # Use domcontentloaded or a fixed delay instead
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            wait_until="domcontentloaded",
            page_timeout=50000,  # 50 seconds max
            delay_before_return_html=3.0,  # Wait 3s for JS to render
            wait_for=None,   # don't wait for selectors by default
        )
        
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(url=source["url"], config=crawler_config)
                
                if not result.success:
                    logger.warning(f"Crawl failed for {source['name']}: {result.error_message}")
                    return []
                
                # Use LLM to extract news
                news_items = await self._extract_news_with_llm(
                    content=result.markdown or result.html or "",
                    source=source
                )
                
                return news_items
                
        except asyncio.TimeoutError:
            logger.warning(f"Timeout scraping {source['name']}")
            return []
        except Exception as e:
            logger.error(f"Error scraping {source['name']}: {e}")
            return []
    
    async def _extract_news_with_llm(
        self,
        content: str,
        source: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Use LLM to intelligently extract news from page content."""
        # Truncate to avoid token limits
        content_preview = content[:12000]
        
        prompt = f"""Extract financial news headlines from this page.

SOURCE: {source['name']}
URL: {source['url']}
CATEGORIES: {', '.join(source['categories'])}

PAGE CONTENT:
{content_preview}

TASK: Extract up to 12 most recent and investment-relevant news items.

For each item provide:
- title: Exact headline text (required)
- url: Full article URL - convert relative to absolute using base URL (required)
- summary: 1-2 sentence summary if visible (optional)
- published_at: ISO date if visible (optional)

IMPORTANT:
- Only extract REAL headlines from the page
- Skip ads, sponsored content, and navigation links
- Focus on news relevant to: markets, economy, RBI, gold, mutual funds, FDs, global events
- If URL is relative like "/news/article", make it absolute: "{source['url'].rstrip('/')}/news/article"

Return JSON:
{{
    "news_items": [
        {{"title": "...", "url": "...", "summary": null, "published_at": null}}
    ]
}}"""
        
        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                model=settings.FAST_MODEL,
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            result = json.loads(response)
            items = result.get("news_items", [])
            
            # Add source metadata
            for item in items:
                item["source"] = source["name"]
                item["categories"] = source["categories"]
            
            return items
            
        except Exception as e:
            logger.error(f"LLM extraction failed for {source['name']}: {e}")
            return []
    
    def _deduplicate_news(self, news_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate news items by URL and similar titles."""
        seen_urls = set()
        seen_titles = set()
        unique = []
        
        for item in news_items:
            url = item.get("url", "")
            title = item.get("title", "").lower().strip()
            
            # Skip if URL already seen
            if url in seen_urls:
                continue
            
            # Skip if very similar title (first 50 chars)
            title_key = title[:50]
            if title_key in seen_titles:
                continue
            
            seen_urls.add(url)
            seen_titles.add(title_key)
            unique.append(item)
        
        return unique
    
    async def _analyze_news_batch(
        self,
        news_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze sentiment and investment relevance for news batch."""
        # Process in batches of 20
        batch_size = 20
        analyzed = []
        
        for i in range(0, len(news_items), batch_size):
            batch = news_items[i:i + batch_size]
            
            headlines = [
                {
                    "idx": j,
                    "title": item.get("title", ""),
                    "summary": item.get("summary", ""),
                    "categories": item.get("categories", [])
                }
                for j, item in enumerate(batch)
            ]
            
            prompt = f"""Analyze these financial news headlines for Indian passive investors.

HEADLINES:
{json.dumps(headlines, indent=2)}

For each headline, assess:
1. sentiment_score: -1.0 (very bearish) to 1.0 (very bullish) for markets
2. relevance_score: 0.0 (irrelevant) to 1.0 (highly relevant) for monthly investment decisions
3. impact_categories: Which asset classes are affected? Choose from:
   - equity (stocks, mutual funds)
   - debt (FDs, bonds, debt funds)
   - gold (gold ETFs, SGBs)
   - silver
   - real_estate
   - international
4. key_insight: One sentence about what this means for a passive investor (null if not relevant)

CONTEXT FOR ANALYSIS:
- RBI rate changes → affects FD rates, debt funds
- Inflation news → affects real returns, gold demand
- US Fed decisions → affects global markets, USD/INR
- Geopolitical tensions → affects gold, market volatility
- FII/DII flows → affects equity markets
- GDP/growth news → affects overall market sentiment
- Budget/tax news → affects investment planning

Return JSON:
{{
    "analysis": [
        {{
            "idx": 0,
            "sentiment_score": 0.0,
            "relevance_score": 0.0,
            "impact_categories": [],
            "key_insight": null
        }}
    ]
}}"""
            
            try:
                response = await self.ai_client.complete(
                    prompt=prompt,
                    model=settings.FAST_MODEL,
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                
                result = json.loads(response)
                analysis_list = result.get("analysis", [])
                analysis_map = {a["idx"]: a for a in analysis_list}
                
                for j, item in enumerate(batch):
                    if j in analysis_map:
                        a = analysis_map[j]
                        item["sentiment_score"] = a.get("sentiment_score", 0)
                        item["relevance_score"] = a.get("relevance_score", 0.5)
                        item["key_insight"] = a.get("key_insight")
                        
                        # Merge categories
                        existing = set(item.get("categories", []))
                        impact = set(a.get("impact_categories", []))
                        item["categories"] = list(existing | impact)
                    
                    analyzed.append(item)
                    
            except Exception as e:
                logger.error(f"Sentiment analysis failed: {e}")
                # Return items without analysis
                analyzed.extend(batch)
        
        return analyzed
    
    async def _store_news(self, news_items: List[Dict[str, Any]]):
        """Store news items in database."""
        for item in news_items:
            # Check if URL already exists
            result = await self.db.execute(
                select(MarketNews).where(MarketNews.url == item["url"])
            )
            if result.scalar_one_or_none():
                continue
            
            # Parse published date - NORMALIZE TO NAIVE UTC
            published_at = None
            if item.get("published_at"):
                try:
                    published_at = datetime.fromisoformat(
                        item["published_at"].replace("Z", "+00:00")
                    )
                    # Strip timezone for naive DB column (store as UTC)
                    if published_at.tzinfo is not None:
                        from datetime import timezone
                        published_at = published_at.astimezone(timezone.utc).replace(tzinfo=None)
                except:
                    published_at = datetime.utcnow()
            else:
                published_at = datetime.utcnow()
            
            news = MarketNews(
                title=item.get("title", "")[:500],  # Also handle missing title
                summary=item.get("summary"),
                source=item["source"],
                url=item["url"],
                published_at=published_at,
                categories=item.get("categories", []),
                sentiment_score=item.get("sentiment_score"),
                relevance_score=item.get("relevance_score")
            )
            self.db.add(news)
        
        await self.db.commit()

    async def get_market_context_for_ai(
        self,
        days: int = 7,
        min_relevance: float = 0.4
    ) -> Dict[str, Any]:
        """
        Get comprehensive market context for AI recommendation engine.
        This is what the LLM uses to understand current market conditions.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        result = await self.db.execute(
            select(MarketNews)
            .where(
                MarketNews.published_at >= cutoff,
                MarketNews.relevance_score >= min_relevance
            )
            .order_by(desc(MarketNews.relevance_score))
            .limit(50)
        )
        news_items = result.scalars().all()
        
        # Organize by category
        by_category = {
            "equity": [],
            "debt": [],
            "gold": [],
            "policy": [],
            "geopolitics": [],
            "economy": [],
        }
        
        for news in news_items:
            cats = news.categories or []
            entry = {
                "title": news.title,
                "sentiment": news.sentiment_score,
                "source": news.source,
                "date": news.published_at.strftime("%Y-%m-%d")
            }
            
            if any(c in cats for c in ["equity", "markets", "mutual_funds"]):
                by_category["equity"].append(entry)
            if any(c in cats for c in ["debt", "fd", "bonds", "interest_rates"]):
                by_category["debt"].append(entry)
            if any(c in cats for c in ["gold", "silver", "commodities"]):
                by_category["gold"].append(entry)
            if any(c in cats for c in ["rbi", "policy", "fed"]):
                by_category["policy"].append(entry)
            if any(c in cats for c in ["geopolitics", "global"]):
                by_category["geopolitics"].append(entry)
            if any(c in cats for c in ["economy", "inflation", "gdp"]):
                by_category["economy"].append(entry)
        
        # Calculate overall sentiment
        sentiments = [n.sentiment_score for n in news_items if n.sentiment_score]
        avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0
        
        return {
            "period": f"Last {days} days",
            "total_news_analyzed": len(news_items),
            "overall_sentiment": round(avg_sentiment, 2),
            "sentiment_label": "bullish" if avg_sentiment > 0.2 else "bearish" if avg_sentiment < -0.2 else "neutral",
            "news_by_category": {k: v[:5] for k, v in by_category.items()},  # Top 5 per category
            "key_themes": await self._extract_key_themes(news_items),
        }
    
    async def _extract_key_themes(self, news_items: List[MarketNews]) -> List[str]:
        """Extract key investment themes from recent news."""
        if not news_items:
            return []
        
        titles = [n.title for n in news_items[:30]]
        
        prompt = f"""From these recent financial news headlines, identify the 5 most important themes for Indian passive investors:

{json.dumps(titles, indent=2)}

Return JSON:
{{
    "themes": [
        "Brief theme description (1 sentence)"
    ]
}}"""
        
        try:
            response = await self.ai_client.complete(
                prompt=prompt,
                model=settings.FAST_MODEL,
                response_format={"type": "json_object"},
                temperature=0.3
            )
            result = json.loads(response)
            return result.get("themes", [])[:5]
        except:
            return []