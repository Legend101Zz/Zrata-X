"""
Signal Processor — converts raw data into structured MarketSignals.

Runs as a batch job (Celery). NOT called at recommendation time.
This is the "pre-processing" layer that keeps the recommendation pipeline fast
and reduces hallucination by giving it structured inputs.

Flow:
1. Read unprocessed MarketNews (sentiment_score IS NULL)
2. Batch headlines (20 at a time)
3. Send to LLM with SIGNAL_EXTRACTION_PROMPT
4. Parse response → MarketSignal rows
5. Mark news as processed (set sentiment_score to a placeholder)
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.config import get_settings
from app.models.asset_data import MarketNews
from app.models.market_signal import MarketSignal
from app.services.ai_engine.openrouter_client import OpenRouterClient
from app.services.ai_engine.prompts import SIGNAL_EXTRACTION_PROMPT
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()

# Signals older than this are deactivated
SIGNAL_MAX_AGE_DAYS = 30
# How many headlines per LLM batch call
BATCH_SIZE = 20


class SignalProcessor:
    """
    Batch-processes raw news into structured MarketSignals.
    
    Design:
    - Idempotent: safe to re-run. Checks for already-processed news.
    - Batched: sends 20 headlines per LLM call to save tokens.
    - Fault-tolerant: one bad batch doesn't kill the whole run.
    - Uses FAST_MODEL for cost efficiency (signal extraction is pattern matching,
      not deep reasoning).
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_client = OpenRouterClient()

    async def process_unprocessed_news(self) -> Dict[str, Any]:
        """
        Main entry point. Called by Celery task.
        Returns stats about the processing run.
        """
        # 1. Get unprocessed news (sentiment_score IS NULL means not yet processed)
        result = await self.db.execute(
            select(MarketNews)
            .where(MarketNews.sentiment_score.is_(None))
            .order_by(desc(MarketNews.published_at))
            .limit(200)  # cap per run
        )
        unprocessed = result.scalars().all()

        if not unprocessed:
            logger.info("No unprocessed news to convert to signals")
            return {"processed": 0, "signals_created": 0}

        logger.info(f"Processing {len(unprocessed)} news items into signals")

        total_signals = 0
        batches_ok = 0
        batches_failed = 0

        # 2. Process in batches
        for i in range(0, len(unprocessed), BATCH_SIZE):
            batch = unprocessed[i : i + BATCH_SIZE]
            try:
                signals_created = await self._process_batch(batch)
                total_signals += signals_created
                batches_ok += 1
            except Exception as e:
                batches_failed += 1
                logger.error(f"Signal extraction batch failed: {e}")
                # Mark these as processed anyway (with score 0.0) to avoid retry loops
                await self._mark_as_processed(batch, fallback_score=0.0)

        # 3. Expire old signals
        expired = await self._expire_old_signals()

        return {
            "news_processed": len(unprocessed),
            "signals_created": total_signals,
            "batches_ok": batches_ok,
            "batches_failed": batches_failed,
            "old_signals_expired": expired,
        }

    async def _process_batch(self, news_batch: List[MarketNews]) -> int:
        """Send a batch of headlines to LLM, parse signals, store them."""
        # Build headlines JSON for the prompt
        headlines = []
        for idx, news in enumerate(news_batch):
            headlines.append({
                "index": idx,
                "title": news.title,
                "source": news.source,
                "date": news.published_at.strftime("%Y-%m-%d") if news.published_at else "unknown",
                "categories": news.categories or [],
            })

        prompt = SIGNAL_EXTRACTION_PROMPT.format(
            headlines_json=json.dumps(headlines, indent=2)
        )

        # Call LLM — use FAST_MODEL for cost efficiency
        response = await self.ai_client.complete(
            prompt=prompt,
            system_prompt="You are a financial signal extractor. Return only valid JSON.",
            model=settings.FAST_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2,  # low temp for consistent structured output
            max_tokens=4096,
        )

        try:
            parsed = json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"LLM returned invalid JSON for signal extraction")
            await self._mark_as_processed(news_batch, fallback_score=0.0)
            return 0

        signals_data = parsed.get("signals", [])
        signals_created = 0

        for sig in signals_data:
            # Skip low-confidence (irrelevant headlines)
            confidence = sig.get("confidence", 0)
            if confidence < 0.3:
                continue

            # Map back to original headline
            headline_idx = sig.get("headline_index", -1)
            original_news = news_batch[headline_idx] if 0 <= headline_idx < len(news_batch) else None
            
            ttl_days = sig.get("ttl_days", 7)

            signal = MarketSignal(
                signal_name=sig.get("signal_name", "unknown")[:200],
                signal_category=sig.get("signal_category", "unknown")[:50],
                source_type="news",
                direction=sig.get("direction", "neutral")[:20],
                strength=sig.get("strength", "low")[:20],
                affected_asset_classes=sig.get("affected_asset_classes", []),
                reasoning=sig.get("reasoning", "")[:1000],
                raw_headline=original_news.title if original_news else None,
                raw_source=original_news.source if original_news else None,
                confidence=confidence,
                expires_at=datetime.utcnow() + timedelta(days=ttl_days),
                is_active=True,
                source_date=original_news.published_at if original_news else None,
            )
            self.db.add(signal)
            signals_created += 1

        # Mark all news in batch as processed
        await self._mark_as_processed(news_batch)
        await self.db.commit()

        logger.info(f"Batch produced {signals_created} signals from {len(news_batch)} headlines")
        return signals_created

    async def _mark_as_processed(
        self, news_batch: List[MarketNews], fallback_score: float = 0.5
    ):
        """Mark news items as processed by setting sentiment_score."""
        news_ids = [n.id for n in news_batch]
        if news_ids:
            await self.db.execute(
                update(MarketNews)
                .where(MarketNews.id.in_(news_ids))
                .values(sentiment_score=fallback_score)
            )

    async def _expire_old_signals(self) -> int:
        """Deactivate signals past their expiry date."""
        result = await self.db.execute(
            update(MarketSignal)
            .where(
                MarketSignal.is_active == True,
                MarketSignal.expires_at < datetime.utcnow(),
            )
            .values(is_active=False)
        )
        await self.db.commit()
        return result.rowcount  # type: ignore

    async def create_signal_from_data_change(
        self,
        signal_name: str,
        category: str,
        direction: str,
        strength: str,
        affected: List[str],
        reasoning: str,
        ttl_days: int = 14,
    ) -> MarketSignal:
        """
        Create a signal directly from a data change (no LLM needed).
        
        Use this for obvious signals like:
        - FD rate increased by 0.5% → "fd_rate_increase", bullish for debt
        - Gold price up 5% in 7 days → "gold_price_surge", bullish for gold
        - RBI rate cut confirmed → "rbi_rate_cut", bullish for equity+debt
        
        These don't need LLM interpretation — the math is clear.
        """
        signal = MarketSignal(
            signal_name=signal_name,
            signal_category=category,
            source_type="data_change",
            direction=direction,
            strength=strength,
            affected_asset_classes=affected,
            reasoning=reasoning,
            confidence=0.9,  # data-derived signals are high confidence
            expires_at=datetime.utcnow() + timedelta(days=ttl_days),
            is_active=True,
            source_date=datetime.utcnow(),
        )
        self.db.add(signal)
        await self.db.commit()
        return signal