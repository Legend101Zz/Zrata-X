"""
Celery application configuration.
"""
from app.config import get_settings
from celery import Celery
from celery.schedules import crontab

settings = get_settings()

celery_app = Celery(
    "passive_compounder",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.data_refresh_tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
)

# Celery Beat schedule - periodic tasks
celery_app.conf.beat_schedule = {
    # =====================================================
    # MUTUAL FUNDS (from MFAPI - updates 3x daily)
    # =====================================================
    "refresh-mf-navs-afternoon": {
        "task": "app.tasks.data_refresh_tasks.refresh_mf_navs",
        "schedule": crontab(hour=14, minute=30),  # After 2:05 PM IST update
    },
    "refresh-mf-navs-night": {
        "task": "app.tasks.data_refresh_tasks.refresh_mf_navs",
        "schedule": crontab(hour=21, minute=30),  # After 9:05 PM IST update
    },
    
    # =====================================================
    # FD RATES (change rarely, daily check is enough)
    # =====================================================
    "refresh-fd-rates-daily": {
        "task": "app.tasks.data_refresh_tasks.refresh_fd_rates",
        "schedule": crontab(hour=7, minute=0),  # 7 AM IST
    },
    
    # =====================================================
    # GOLD/SILVER (for monthly investing, 2x daily is plenty)
    # =====================================================
    "refresh-metals-morning": {
        "task": "app.tasks.data_refresh_tasks.refresh_gold_prices",
        "schedule": crontab(hour=10, minute=0),  # 10 AM IST
    },
    "refresh-metals-evening": {
        "task": "app.tasks.data_refresh_tasks.refresh_gold_prices",
        "schedule": crontab(hour=18, minute=0),  # 6 PM IST
    },
    
    # =====================================================
    # NEWS (for monthly digest, 3x daily is enough)
    # =====================================================
    "refresh-news-morning": {
        "task": "app.tasks.data_refresh_tasks.refresh_news",
        "schedule": crontab(hour=8, minute=0),
    },
    "refresh-news-afternoon": {
        "task": "app.tasks.data_refresh_tasks.refresh_news",
        "schedule": crontab(hour=14, minute=0),
    },
    "refresh-news-evening": {
        "task": "app.tasks.data_refresh_tasks.refresh_news",
        "schedule": crontab(hour=20, minute=0),
    },
    
    # =====================================================
    # MACRO INDICATORS (RBI rates change ~6x/year, daily is overkill)
    # =====================================================
    "refresh-macro-daily": {
        "task": "app.tasks.data_refresh_tasks.refresh_macro_indicators",
        "schedule": crontab(hour=9, minute=0),  # Once daily
    },
    
    # =====================================================
    # ETF PRICES (daily is enough for passive investing)
    # =====================================================
    "refresh-etf-prices-daily": {
        "task": "app.tasks.data_refresh_tasks.refresh_etf_prices",
        "schedule": crontab(hour=16, minute=30),  # After market close
    },
    
    # =====================================================
    # PORTFOLIO VALUES (daily update is sufficient)
    # =====================================================
    "update-portfolio-values-daily": {
        "task": "app.tasks.data_refresh_tasks.update_portfolio_values",
        "schedule": crontab(hour=17, minute=0),
    },
    
    # =====================================================
    # WEEKLY DIGEST (synthesis of news for users)
    # =====================================================
    "generate-weekly-digest": {
        "task": "app.tasks.data_refresh_tasks.generate_weekly_digest",
        "schedule": crontab(hour=10, minute=0, day_of_week=0),  # Sunday 10 AM
    },
    
    # =====================================================
    # CLEANUP (keep DB size manageable)
    # =====================================================
    "cleanup-old-data-weekly": {
        "task": "app.tasks.data_refresh_tasks.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
    },
}