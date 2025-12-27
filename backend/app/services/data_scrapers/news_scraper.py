"""
News scraper - Alternative to NewsService if simpler scraping is needed.
"""
import logging
import re
from datetime import datetime
from typing import Any, Dict, List

from crawl4ai import (AsyncWebCrawler, BrowserConfig, CacheMode,
                      CrawlerRunConfig)

logger = logging.getLogger(__name__)


class NewsScraper:
    """
    Simple news scraper for financial news.
    Use this for basic scraping without AI sentiment analysis.
    """
    
    SOURCES = {
        "moneycontrol": {
            "url": "https://www.moneycontrol.com/news/business/markets/",
            "patterns": {
                "title": r'<h2[^>]*>([^<]+)</h2>',
                "link": r'href="(https://www\.moneycontrol\.com/news/[^"]+)"'
            }
        },
        "economictimes": {
            "url": "https://economictimes.indiatimes.com/markets",
            "patterns": {
                "title": r'<h[23][^>]*>([^<]+)</h[23]>',
                "link": r'href="(/markets/[^"]+)"'
            }
        }
    }
    
    async def scrape_headlines(self, source: str = "moneycontrol") -> List[Dict[str, Any]]:
        """
        Scrape news headlines from a source.
        
        Args:
            source: Name of the news source
            
        Returns:
            List of news items with title and url
        """
        if source not in self.SOURCES:
            logger.warning(f"Unknown source: {source}")
            return []
        
        config = self.SOURCES[source]
        
        browser_config = BrowserConfig(headless=True)
        crawler_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            wait_for="networkidle"
        )
        
        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(
                    url=config["url"],
                    config=crawler_config
                )
                
                if not result.success:
                    logger.error(f"Failed to crawl {source}: {result.error_message}")
                    return []
                
                html = result.html or ""
                
                # Extract titles
                titles = re.findall(config["patterns"]["title"], html)
                links = re.findall(config["patterns"]["link"], html)
                
                # Combine and clean
                news_items = []
                for i, title in enumerate(titles[:20]):  # Limit to 20 items
                    title = title.strip()
                    if len(title) > 10:  # Filter out very short titles
                        url = links[i] if i < len(links) else ""
                        if not url.startswith("http"):
                            # Make absolute URL
                            base = config["url"].rsplit("/", 1)[0]
                            url = base + url
                        
                        news_items.append({
                            "title": title,
                            "url": url,
                            "source": source,
                            "scraped_at": datetime.utcnow().isoformat()
                        })
                
                return news_items
                
        except Exception as e:
            logger.error(f"Error scraping {source}: {e}")
            return []
    
    async def scrape_all_sources(self) -> List[Dict[str, Any]]:
        """Scrape headlines from all configured sources."""
        all_news = []
        
        for source in self.SOURCES:
            news = await self.scrape_headlines(source)
            all_news.extend(news)
        
        return all_news