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
    # Refresh mutual fund NAVs 3 times daily (matches MFAPI update schedule)
    "refresh-mf-navs-morning": {
        "task": "app.tasks.data_refresh_tasks.refresh_mf_navs",
        "schedule": crontab(hour=9, minute=30),  # 9:30 AM IST
    },
    "refresh-mf-navs-evening": {
        "task": "app.tasks.data_refresh_tasks.refresh_mf_navs",
        "schedule": crontab(hour=21, minute=30),  # 9:30 PM IST
    },
    
    # Refresh FD rates once daily
    "refresh-fd-rates-daily": {
        "task": "app.tasks.data_refresh_tasks.refresh_fd_rates",
        "schedule": crontab(hour=6, minute=0),  # 6 AM IST
    },
    
    # Refresh gold prices every 30 minutes during market hours
    "refresh-gold-prices": {
        "task": "app.tasks.data_refresh_tasks.refresh_gold_prices",
        "schedule": crontab(minute="*/30", hour="9-18"),  # Every 30 mins, 9 AM - 6 PM
    },
    
    # Refresh news every hour
    "refresh-news-hourly": {
        "task": "app.tasks.data_refresh_tasks.refresh_news",
        "schedule": crontab(minute=0),  # Every hour
    },
    
    # Refresh macro indicators twice daily
    "refresh-macro-morning": {
        "task": "app.tasks.data_refresh_tasks.refresh_macro_indicators",
        "schedule": crontab(hour=8, minute=0),
    },
    "refresh-macro-evening": {
        "task": "app.tasks.data_refresh_tasks.refresh_macro_indicators",
        "schedule": crontab(hour=18, minute=0),
    },
    
    # Full data sync weekly
    "weekly-full-sync": {
        "task": "app.tasks.data_refresh_tasks.refresh_all_data",
        "schedule": crontab(hour=2, minute=0, day_of_week=0),  # Sunday 2 AM
    },
    
    # Discover new FD sources monthly
    "monthly-fd-discovery": {
        "task": "app.tasks.data_refresh_tasks.discover_new_fd_sources",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),  # 1st of month
    },
}