#!/usr/bin/env python
"""
Run RSS ingestion + signal processing.
Usage: python -m app.scripts.run_rss_and_signals [--step all|rss|signals]

Each step runs in its own DB session so a failure in one does not
poison the next. RSS duplicates are silently skipped at the ingester
level; if they slip through here the step fails cleanly and signals
still run.
"""
import argparse
import asyncio
import json
import logging

from app.database import get_async_session_factory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("rss_signals")


# ──────────────────────────────────────────────
# Step runners  (each receives a fresh session)
# ──────────────────────────────────────────────

async def run_rss_ingestion(db):
    """Fetch all RSS feeds and store new articles."""
    from app.services.data_scrapers.rss_news_ingester import RSSNewsIngester

    logger.info("=" * 50)
    logger.info("STEP 1: RSS News Ingestion")
    logger.info("=" * 50)

    ingester = RSSNewsIngester(db)
    try:
        result = await ingester.ingest_all_feeds()
        logger.info(f"RSS result: {json.dumps(result, indent=2)}")
        return result
    finally:
        await ingester.close()


async def run_signal_processing(db):
    """Convert unprocessed news → structured MarketSignals."""
    from app.services.ai_engine.signal_processor import SignalProcessor

    logger.info("=" * 50)
    logger.info("STEP 2: Signal Processing (LLM)")
    logger.info("=" * 50)

    processor = SignalProcessor(db)
    result = await processor.process_unprocessed_news()
    logger.info(f"Signal result: {json.dumps(result, indent=2)}")
    return result


async def show_active_signals(db):
    """Print current active signals."""
    from app.models.market_signal import MarketSignal
    from sqlalchemy import desc, select

    logger.info("=" * 50)
    logger.info("ACTIVE SIGNALS")
    logger.info("=" * 50)

    result = await db.execute(
        select(MarketSignal)
        .where(MarketSignal.is_active == True)
        .order_by(desc(MarketSignal.confidence))
        .limit(20)
    )
    signals = result.scalars().all()

    if not signals:
        logger.info("No active signals yet.")
        return

    for s in signals:
        logger.info(
            f"  [{s.direction:>7}] {s.signal_name:<30} "
            f"conf={s.confidence:.1f}  affects={s.affected_asset_classes}"
        )
        logger.info(f"           {s.reasoning}")
    logger.info(f"\nTotal active signals: {len(signals)}")


# ──────────────────────────────────────────────
# Orchestrator  (one session per step)
# ──────────────────────────────────────────────

async def main(step: str = "all"):
    AsyncSessionLocal = get_async_session_factory()
    rss_ok = True

    # ── Step 1: RSS ingestion ──────────────────
    if step in ["all", "rss"]:
        async with AsyncSessionLocal() as db:
            try:
                await run_rss_ingestion(db)
                await db.commit()
            except Exception as e:
                logger.error(f"RSS ingestion failed (continuing): {e}", exc_info=True)
                await db.rollback()
                rss_ok = False
                # Do NOT raise — signal processing is independent

    # ── Step 2: Signal processing ──────────────
    if step in ["all", "signals"]:
        async with AsyncSessionLocal() as db:
            try:
                await run_signal_processing(db)
                await db.commit()
            except Exception as e:
                logger.error(f"Signal processing failed: {e}", exc_info=True)
                await db.rollback()
                # Signals failing IS worth raising — it's the core value of this script
                raise

    # ── Always: show what's in DB ──────────────
    async with AsyncSessionLocal() as db:
        try:
            await show_active_signals(db)
        except Exception as e:
            logger.error(f"Could not display signals: {e}", exc_info=True)

    if not rss_ok:
        logger.warning(
            "RSS ingestion had errors. Check logs above. "
            "Likely cause: duplicate IDs — fix the ingester to use ON CONFLICT DO NOTHING."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run RSS ingestion and signal processing")
    parser.add_argument(
        "--step",
        choices=["all", "rss", "signals"],
        default="all",
        help="Which step to run (default: all)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.step))