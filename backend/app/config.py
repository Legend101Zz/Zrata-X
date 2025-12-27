"""
Configuration management for Passive Compounder.
All settings are loaded from environment variables - no hardcoding.
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # App
    APP_NAME: str = "Zrata-X"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # External APIs
    OPENROUTER_API_KEY: str
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    SUPERMEMORY_API_KEY: str
    METALS_API_KEY: Optional[str] = None  # Optional: for gold prices
    
    # AI Models (configurable via env - not hardcoded)
    PRIMARY_MODEL: str = "anthropic/claude-sonnet-4-20250514"
    FAST_MODEL: str = "meta-llama/llama-3.1-8b-instruct"
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # Data refresh intervals (in seconds)
    MF_NAV_REFRESH_INTERVAL: int = 3600  # 1 hour
    FD_RATES_REFRESH_INTERVAL: int = 86400  # 24 hours
    GOLD_PRICE_REFRESH_INTERVAL: int = 1800  # 30 mins
    NEWS_REFRESH_INTERVAL: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()