"""
End-to-end test for the Zrata-X recommendation pipeline.

Usage:
    cd backend
    python -m tests.test_pipeline

Tests:
1. RSS ingestion (fetches real feeds)
2. Signal processing (real LLM calls — needs OPENROUTER_API_KEY)
3. Recommendation pipeline (full multi-step flow)

Requires: running PostgreSQL + .env configured
"""
import asyncio
import json
import logging
import sys
from datetime import datetime

from app.config import get_settings
from app.database import get_async_session_factory

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s: %(message)s")
logger = logging.getLogger("test_pipeline")
settings = get_settings()


async def test_rss_ingestion():
    """Test 1: Can we fetch RSS feeds and store news?"""
    logger.info("=" * 60)
    logger.info("TEST 1: RSS News Ingestion")
    logger.info("=" * 60)

    from app.services.data_scrapers.rss_news_ingester import RSSNewsIngester

    AsyncSessionLocal = get_async_session_factory()
    async with AsyncSessionLocal() as db:
        ingester = RSSNewsIngester(db)
        try:
            result = await ingester.ingest_all_feeds()
            logger.info(f"Result: {json.dumps(result, indent=2)}")
            
            assert result["feeds_ok"] > 0, "No feeds succeeded!"
            assert result["total_fetched"] > 0, "No articles fetched!"
            logger.info(f"✅ RSS ingestion OK — {result['feeds_ok']} feeds, {result['new_stored']} new articles")
            return True
        except Exception as e:
            logger.error(f"❌ RSS ingestion failed: {e}")
            return False
        finally:
            await ingester.close()


async def test_signal_processing():
    """Test 2: Can we convert raw news into signals via LLM?"""
    logger.info("=" * 60)
    logger.info("TEST 2: Signal Processing (requires LLM)")
    logger.info("=" * 60)

    from app.services.ai_engine.signal_processor import SignalProcessor

    AsyncSessionLocal = get_async_session_factory()
    async with AsyncSessionLocal() as db:
        processor = SignalProcessor(db)
        try:
            result = await processor.process_unprocessed_news()
            logger.info(f"Result: {json.dumps(result, indent=2)}")
            logger.info(f"✅ Signal processing OK — {result['signals_created']} signals created")
            return True
        except Exception as e:
            logger.error(f"❌ Signal processing failed: {e}")
            return False


async def test_recommendation_pipeline(user_id: int = 1, amount: float = 50000):
    """Test 3: Full recommendation pipeline."""
    logger.info("=" * 60)
    logger.info(f"TEST 3: Full Recommendation Pipeline (user={user_id}, ₹{amount:,.0f})")
    logger.info("=" * 60)

    from app.services.ai_engine.recommendation_pipeline import \
        RecommendationPipeline

    AsyncSessionLocal = get_async_session_factory()
    async with AsyncSessionLocal() as db:
        pipeline = RecommendationPipeline(db)
        try:
            result = await pipeline.generate(user_id=user_id, amount=amount)
            
            if result.get("error"):
                logger.error(f"❌ Pipeline returned error: {result['error']}")
                logger.info("   (This is expected if user_id=1 doesn't exist. Create a test user first.)")
                return False
            
            logger.info("\n── STRATEGY ──")
            logger.info(json.dumps(result.get("strategy", {}), indent=2))
            
            logger.info("\n── ALLOCATION ──")
            for a in result.get("allocation", []):
                logger.info(f"  {a['asset_class']}: ₹{a['amount']:,.0f} ({a['percentage']}%)")
            
            logger.info("\n── VALIDATION ──")
            logger.info(json.dumps(result.get("validation", {}), indent=2))
            
            logger.info("\n── EXPLANATION ──")
            logger.info(result.get("explanation", ""))
            
            logger.info(f"\n✅ Full pipeline completed successfully!")
            return True
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            import traceback
            traceback.print_exc()
            return False


async def test_signal_query():
    """Test 4: Can we query active signals from the DB?"""
    logger.info("=" * 60)
    logger.info("TEST 4: Query Active Signals")
    logger.info("=" * 60)

    from app.models.market_signal import MarketSignal
    from sqlalchemy import desc, select

    AsyncSessionLocal = get_async_session_factory()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(MarketSignal)
            .where(MarketSignal.is_active == True)
            .order_by(desc(MarketSignal.confidence))
            .limit(10)
        )
        signals = result.scalars().all()
        
        if not signals:
            logger.info("⚠️  No active signals found. Run test_signal_processing first.")
            return True
        
        logger.info(f"Found {len(signals)} active signals:")
        for s in signals:
            logger.info(
                f"  [{s.direction.upper():>7}] {s.signal_name} "
                f"(confidence={s.confidence}, affects={s.affected_asset_classes})"
            )
            logger.info(f"           → {s.reasoning}")
        
        logger.info(f"✅ Signal query OK")
        return True


async def main():
    """Run all tests in sequence."""
    logger.info("🚀 Zrata-X Pipeline Test Suite")
    logger.info(f"   Database: {settings.DATABASE_URL[:50]}...")
    logger.info(f"   Primary Model: {settings.PRIMARY_MODEL}")
    logger.info(f"   Fast Model: {settings.FAST_MODEL}")
    logger.info("")

    results = {}

    # Test 1: RSS
    results["rss_ingestion"] = await test_rss_ingestion()

    # Test 2: Signal Processing (needs LLM)
    results["signal_processing"] = await test_signal_processing()

    # Test 3: Query signals
    results["signal_query"] = await test_signal_query()

    # Test 4: Full pipeline
    results["recommendation_pipeline"] = await test_recommendation_pipeline()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"  {status}  {name}")

    all_passed = all(results.values())
    logger.info(f"\n{'All tests passed!' if all_passed else 'Some tests failed.'}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))    