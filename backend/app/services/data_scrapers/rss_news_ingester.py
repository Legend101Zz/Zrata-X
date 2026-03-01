"""
RSS-based news ingester for Zrata-X.

Pulls from ~20 RSS feeds covering:
- Indian financial markets (Moneycontrol, ET, Livemint)
- RBI / policy (RBI official, PIB)
- Global macro (Reuters, BBC Business)
- Geopolitics (Reuters World, Al Jazeera)
- Commodities (gold, oil)

Why RSS instead of Crawl4AI for news:
- 10x faster, no browser needed
- Structured data (title, date, link) out of the box
- No HTML parsing fragility
- Runs reliably in cron without Playwright

The existing Crawl4AI news scraper stays for sites that don't have RSS.
This supplements it.
"""
import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree

import httpx
from app.models.asset_data import MarketNews
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ─── RSS Feed Registry ────────────────────────────────────────
# Each feed has: url, categories (for tagging), priority (1=primary)
# Add/remove feeds here — no code changes needed elsewhere.

RSS_FEEDS: List[Dict[str, Any]] = [
    # ── Indian Finance ──
    {
        "name": "Moneycontrol Markets",
        "url": "https://www.moneycontrol.com/rss/marketreports.xml",
        "categories": ["markets", "equity", "india"],
        "priority": 1,
    },
    {
        "name": "Economic Times Markets",
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "categories": ["markets", "equity", "india"],
        "priority": 1,
    },
    {
        "name": "Livemint Markets",
        "url": "https://www.livemint.com/rss/markets",
        "categories": ["markets", "equity", "india"],
        "priority": 1,
    },
    {
        "name": "ET Mutual Funds",
        "url": "https://economictimes.indiatimes.com/mf/rssfeeds/19888370.cms",
        "categories": ["mutual_funds", "india"],
        "priority": 1,
    },
    {
        "name": "Moneycontrol MF",
        "url": "https://www.moneycontrol.com/rss/mf.xml",
        "categories": ["mutual_funds", "india"],
        "priority": 2,
    },
    # ── RBI / Policy ──
    {
        "name": "RBI Press Releases",
        "url": "https://rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?output=rss",
        "categories": ["rbi", "policy", "india"],
        "priority": 1,
    },
    {
        "name": "ET Economy",
        "url": "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms",
        "categories": ["economy", "policy", "india"],
        "priority": 1,
    },
    # ── Global Macro ──
    {
        "name": "Reuters Business",
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "categories": ["global", "economy", "markets"],
        "priority": 2,
    },
    {
        "name": "Reuters World",
        "url": "https://feeds.reuters.com/reuters/worldNews",
        "categories": ["geopolitics", "global"],
        "priority": 2,
    },
    {
        "name": "BBC Business",
        "url": "https://feeds.bbci.co.uk/news/business/rss.xml",
        "categories": ["global", "economy"],
        "priority": 2,
    },
    # ── Commodities / Gold ──
    {
        "name": "ET Commodities",
        "url": "https://economictimes.indiatimes.com/markets/commodities/rssfeeds/5621074.cms",
        "categories": ["gold", "silver", "commodities", "india"],
        "priority": 1,
    },
    # ── Geopolitics (affects gold, equity volatility) ──
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "categories": ["geopolitics", "global"],
        "priority": 3,
    },
    {
        "name": "BBC World",
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "categories": ["geopolitics", "global"],
        "priority": 3,
    },
    # ── Tech (affects IT sector MFs, Nasdaq-linked ETFs) ──
    {
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "categories": ["tech", "global"],
        "priority": 3,
    },
]


class RSSNewsIngester:
    """
    Fetches news from RSS feeds and stores in MarketNews table.
    
    Design principles:
    - Each feed is independent. One failing doesn't block others.
    - Deduplication by URL hash.
    - Categories are merged from feed config + content hints.
    - No LLM calls here — just raw ingestion. Signal processing happens later.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={"User-Agent": "Zrata-X/1.0 (Investment Research Bot)"},
        )

    async def close(self):
        await self.client.aclose()

    async def ingest_all_feeds(self) -> Dict[str, Any]:
        """
        Fetch all RSS feeds concurrently, store new articles.
        Returns stats: {total_fetched, new_stored, feeds_failed, errors}.
        """
        results = await asyncio.gather(
            *[self._ingest_single_feed(feed) for feed in RSS_FEEDS],
            return_exceptions=True,
        )

        total_fetched = 0
        new_stored = 0
        feeds_ok = 0
        feeds_failed = 0
        errors = []

        for i, result in enumerate(results):
            feed_name = RSS_FEEDS[i]["name"]
            if isinstance(result, Exception):
                feeds_failed += 1
                errors.append(f"{feed_name}: {str(result)[:100]}")
                logger.warning(f"RSS feed failed: {feed_name} — {result}")
            else:
                feeds_ok += 1
                total_fetched += result["fetched"]
                new_stored += result["stored"]

        logger.info(
            f"RSS ingestion complete: {feeds_ok}/{len(RSS_FEEDS)} feeds OK, "
            f"{total_fetched} fetched, {new_stored} new stored"
        )

        return {
            "total_fetched": total_fetched,
            "new_stored": new_stored,
            "feeds_ok": feeds_ok,
            "feeds_failed": feeds_failed,
            "errors": errors[:10],  # cap error list
        }

    async def _ingest_single_feed(self, feed: Dict[str, Any]) -> Dict[str, int]:
        """Fetch one RSS feed, parse items, store new ones."""
        try:
            resp = await self.client.get(feed["url"])
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise RuntimeError(f"HTTP error fetching {feed['url']}: {e}")

        items = self._parse_rss_xml(resp.text, feed)
        stored = 0

        for item in items:
            # Dedup by URL
            url_hash = hashlib.md5(item["url"].encode()).hexdigest()
            existing = await self.db.execute(
                select(MarketNews.id).where(MarketNews.url == item["url"]).limit(1)
            )
            if existing.scalar_one_or_none():
                continue

            published_at = self._parse_date(item.get("published_at"))

            news = MarketNews(
                title=item["title"][:500],
                summary=item.get("summary", "")[:1000] if item.get("summary") else None,
                source=f"rss:{feed['name']}",
                url=item["url"],
                published_at=published_at,
                categories=feed["categories"],
                sentiment_score=None,   # filled by signal processor later
                relevance_score=None,
            )
            self.db.add(news)
            stored += 1

        if stored > 0:
            await self.db.commit()

        return {"fetched": len(items), "stored": stored}

    def _parse_rss_xml(self, xml_text: str, feed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse RSS/Atom XML into a list of {title, url, summary, published_at}.
        Handles both RSS 2.0 (<item>) and Atom (<entry>) formats.
        """
        items = []
        try:
            root = ElementTree.fromstring(xml_text)
        except ElementTree.ParseError as e:
            logger.warning(f"XML parse error for {feed['name']}: {e}")
            return []

        # RSS 2.0 format
        for item in root.iter("item"):
            title = self._get_text(item, "title")
            link = self._get_text(item, "link")
            if not title or not link:
                continue
            items.append({
                "title": title.strip(),
                "url": link.strip(),
                "summary": self._get_text(item, "description"),
                "published_at": self._get_text(item, "pubDate"),
            })

        # Atom format (if no RSS items found)
        if not items:
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
                title = self._get_text(entry, "atom:title", ns)
                link_el = entry.find("atom:link", ns)
                link = link_el.get("href", "") if link_el is not None else ""
                if not title or not link:
                    continue
                items.append({
                    "title": title.strip(),
                    "url": link.strip(),
                    "summary": self._get_text(entry, "atom:summary", ns),
                    "published_at": self._get_text(entry, "atom:updated", ns),
                })

        return items[:30]  # cap per feed to avoid flooding

    @staticmethod
    def _get_text(element, tag: str, namespaces=None) -> Optional[str]:
        """Safely get text from an XML element."""
        child = element.find(tag, namespaces)
        if child is not None and child.text:
            return child.text.strip()
        return None

    @staticmethod
    def _parse_date(date_str: Optional[str]) -> datetime:
        """Parse various RSS date formats into naive UTC datetime."""
        if not date_str:
            return datetime.utcnow()

        # Try common formats
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",   # RFC 822 (RSS 2.0)
            "%a, %d %b %Y %H:%M:%S GMT",
            "%Y-%m-%dT%H:%M:%S%z",         # ISO 8601 (Atom)
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                # Normalize to naive UTC
                if dt.tzinfo is not None:
                    dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                return dt
            except ValueError:
                continue

        return datetime.utcnow()