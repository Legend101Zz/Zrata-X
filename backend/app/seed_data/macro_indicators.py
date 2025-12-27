"""
Known macro indicator sources.
These are RELIABLE APIs and sources, not scraped URLs.
"""

MACRO_DATA_SOURCES = {
    # RBI Official Data
    "rbi_policy_rates": {
        "source": "RBI DBIE",
        "api_url": "https://dbie.rbi.org.in",
        "manual_url": "https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx",
        "indicators": ["repo_rate", "reverse_repo_rate", "crr", "slr", "msf_rate"],
        "update_frequency": "on_policy_change",  # MPC meetings
        "notes": "RBI changes rates ~6 times a year via MPC",
    },
    
    # Inflation Data
    "inflation_cpi": {
        "source": "MOSPI",
        "api_url": None,  # No public API
        "manual_url": "https://www.mospi.gov.in/",
        "indicators": ["cpi_combined", "cpi_urban", "cpi_rural"],
        "update_frequency": "monthly",  # ~12th of each month
        "notes": "CPI data released monthly by MOSPI",
    },
    
    # Exchange Rates (Reliable free APIs)
    "forex": {
        "source": "ExchangeRate-API",
        "api_url": "https://api.exchangerate-api.com/v4/latest/USD",
        "indicators": ["usd_inr"],
        "update_frequency": "daily",
        "notes": "Free API, no auth needed",
    },
    
    # Gold/Silver Prices (Multiple fallbacks)
    "precious_metals": {
        "primary_source": "MCX",
        "fallback_sources": [
            {
                "name": "GoldAPI",
                "api_url": "https://www.goldapi.io/api/XAU/INR",
                "requires_key": True,
            },
            {
                "name": "Metals.dev",
                "api_url": "https://api.metals.dev/v1/latest",
                "requires_key": True,
            },
        ],
        "indicators": ["gold_price_inr", "silver_price_inr"],
        "update_frequency": "hourly_during_trading",
    },
}

# Current known values (fallback only, updated via admin)
# These are ONLY used if all APIs fail
FALLBACK_MACRO_VALUES = {
    "repo_rate": {
        "value": 6.5,
        "unit": "percent",
        "as_of": "2024-12-01",
        "source": "RBI MPC December 2024",
    },
    "reverse_repo_rate": {
        "value": 3.35,
        "unit": "percent", 
        "as_of": "2024-12-01",
        "source": "RBI",
    },
    "crr": {
        "value": 4.0,
        "unit": "percent",
        "as_of": "2024-12-01",
        "source": "RBI",
    },
    "slr": {
        "value": 18.0,
        "unit": "percent",
        "as_of": "2024-12-01",
        "source": "RBI",
    },
    "cpi_inflation": {
        "value": 5.5,
        "unit": "percent",
        "as_of": "2024-11-01",
        "source": "MOSPI",
    },
}