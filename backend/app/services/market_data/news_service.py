"""
Financial news scraping and sentiment analysis.
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List

from app.config import get_settings
from app.models.asset_data import MarketNews
from app.services.ai_engine.openrouter_client import OpenRouterClient
from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()


class NewsService:
    """
    Scrapes and analyzes financial news for investment insights.
    """
    
    NEWS_SOURCES = [
        {
            "name": "Moneycontrol",
            "url": "https://www.moneycontrol.com/news/business/markets/",
            "category": "markets"
        },
        {
            "name": "Economic Times",
            "url": "https://economictimes.indiatimes.com/markets",
            "category": "markets"
        },
        {
            "name": "LiveMint",
            "url": "https://www.livemint.com/market",
            "category": "markets"
        },
        {
            "name": "RBI News",
            "url": "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
            "category": "rbi"
        }
    ]
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()
    
    async def fetch_and_analyze_news(self) -> Dict[str, Any]:
        """Fetch news from all sources and analyze sentiment."""
        all_news = []
        
        for source in self.NEWS_SOURCES:
            try:
                news_items = await self._scrape_news_source(source)
                all_news.extend(news_items)
            except Exception as e:
                logger.error(f"Failed to scrape {source['name']}: {e}")
        
        # Deduplicate by URL
        seen_urls = set()
        unique_news = []
        for item in all_news:
            if item["url"] not in seen_urls:
                seen_urls.add(item["url"])
                unique_news.append(item)
        
        # Analyze sentiment in batches
        if unique_news:
            analyzed_news = await self._analyze_sentiment_batch(unique_news)
            await self._store_news(analyzed_news)
            return {"news_count": len(analyzed_news), "sources": len(self.NEWS_SOURCES)}
        
        return {"news_count": 0, "sources": len(self.NEWS_SOURCES)}
    
    async def _scrape_news_source(self, source: Dict[str, str]) -> List[Dict[str, Any]]:
        """Scrape news from a single source."""
        browser_config = BrowserConfig(headless=True)
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            wait_for="networkidle"
        )
        
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=source["url"], config=crawler_config)
            
            if not result.success:
                return []
            
            # Use AI to extract news items from the page
            extraction_prompt = f"""
            Extract news headlines from this financial news page content.
            Source: {source['name']}
            
            Content:
            {result.markdown[:8000]}
            
            Extract up to 10 most recent news items. For each item provide:
            - title: The headline
            - url: The article URL (make absolute if relative, base: {source['url']})
            - summary: Brief summary if available, otherwise null
            - published_at: Publication date/time if available (ISO format), otherwise null
            
            Return as JSON array with keys: title, url, summary, published_at
            """
            
            response = await self.ai_client.complete(
                prompt=extraction_prompt,
                model=settings.FAST_MODEL,
                response_format={"type": "json_object"}
            )
            
            try:
                items = json.loads(response)
                if isinstance(items, dict):
                    items = items.get("news", items.get("items", []))
                
                for item in items:
                    item["source"] = source["name"]
                    item["categories"] = [source["category"]]
                
                return items
            except json.JSONDecodeError:
                logger.error(f"Failed to parse news extraction for {source['name']}")
                return []
    
    async def _analyze_sentiment_batch(
        self,
        news_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze sentiment for a batch of news items."""
        # Prepare batch for analysis
        titles_for_analysis = [
            {"index": i, "title": item["title"], "summary": item.get("summary", "")}
            for i, item in enumerate(news_items)
        ]
        
        prompt = f"""
        Analyze the sentiment of these financial news headlines for Indian market investors.
        
        News items:
        {json.dumps(titles_for_analysis, indent=2)}
        
        For each item, provide:
        - index: The original index
        - sentiment_score: A score from -1 (very bearish) to 1 (very bullish)
        - relevance_score: How relevant this is for investment decisions (0-1)
        - categories: Array of relevant categories like ["gold", "rbi", "inflation", "equity", "debt", "tax"]
        
        Return as JSON array.
        """
        
        response = await self.ai_client.complete(
            prompt=prompt,
            model=settings.FAST_MODEL,
            response_format={"type": "json_object"}
        )
        
        try:
            analysis = json.loads(response)
            if isinstance(analysis, dict):
                analysis = analysis.get("results", analysis.get("items", []))
            
            # Merge analysis back into news items
            analysis_map = {a["index"]: a for a in analysis}
            
            for i, item in enumerate(news_items):
                if i in analysis_map:
                    item["sentiment_score"] = analysis_map[i].get("sentiment_score", 0)
                    item["relevance_score"] = analysis_map[i].get("relevance_score", 0.5)
                    # Merge categories
                    existing_cats = set(item.get("categories", []))
                    new_cats = set(analysis_map[i].get("categories", []))
                    item["categories"] = list(existing_cats | new_cats)
            
            return news_items
            
        except json.JSONDecodeError:
            logger.error("Failed to parse sentiment analysis")
            return news_items
    
    async def _store_news(self, news_items: List[Dict[str, Any]]):
        """Store news items in database."""
        for item in news_items:
            # Check if URL already exists
            result = await self.db.execute(
                select(MarketNews).where(MarketNews.url == item["url"])
            )
            if result.scalar_one_or_none():
                continue
            
            # Parse published date
            published_at = None
            if item.get("published_at"):
                try:
                    published_at = datetime.fromisoformat(
                        item["published_at"].replace("Z", "+00:00")
                    )
                except:
                    published_at = datetime.utcnow()
            else:
                published_at = datetime.utcnow()
            
            news = MarketNews(
                title=item["title"][:500],
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
    
    async def get_investment_relevant_news(
        self,
        categories: List[str] = None,
        min_relevance: float = 0.5,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get news relevant to investment decisions."""
        from datetime import timedelta

        from sqlalchemy import desc
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        query = select(MarketNews).where(
            MarketNews.published_at >= week_ago,
            MarketNews.relevance_score >= min_relevance
        ).order_by(desc(MarketNews.published_at)).limit(limit)
        
        result = await self.db.execute(query)
        news = result.scalars().all()
        
        if categories:
            news = [
                n for n in news 
                if any(cat in (n.categories or []) for cat in categories)
            ]
        
        return [
            {
                "title": n.title,
                "summary": n.summary,
                "source": n.source,
                "url": n.url,
                "sentiment": n.sentiment_score,
                "categories": n.categories,
                "published_at": n.published_at.isoformat()
            }
            for n in news
        ]