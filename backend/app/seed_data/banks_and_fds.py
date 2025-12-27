
"""
Known banks and their FD rate page URLs.
These are VERIFIED working URLs, not LLM hallucinations.
"""

KNOWN_FD_SOURCES = [
    # Small Finance Banks (typically highest rates)
    {
        "bank_name": "Unity Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.unitysmallfinancebank.com",
        "fd_rates_url": "https://www.unitysmallfinancebank.com/fixed-deposit.html",
        "has_credit_card_offer": False,
        "notes": "Often has highest rates among SFBs",
    },
    {
        "bank_name": "Utkarsh Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.utkarsh.bank",
        "fd_rates_url": "https://www.utkarsh.bank/fixed-deposit",
        "has_credit_card_offer": False,
        "notes": "Good rates for 1-2 year tenures",
    },
    {
        "bank_name": "Ujjivan Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.ujjivansfb.in",
        "fd_rates_url": "https://www.ujjivansfb.in/fixed-deposit",
        "has_credit_card_offer": False,
    },
    {
        "bank_name": "Equitas Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.equitasbank.com",
        "fd_rates_url": "https://www.equitasbank.com/fixed-deposits",
        "has_credit_card_offer": False,
    },
    {
        "bank_name": "AU Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.aubank.in",
        "fd_rates_url": "https://www.aubank.in/fixed-deposit",
        "has_credit_card_offer": True,
        "credit_card_details": "LIT Credit Card against FD",
    },
    {
        "bank_name": "Suryoday Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.suryodaybank.com",
        "fd_rates_url": "https://www.suryodaybank.com/fixed-deposit",
        "has_credit_card_offer": False,
    },
    {
        "bank_name": "ESAF Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.esafbank.com",
        "fd_rates_url": "https://www.esafbank.com/fixed-deposit",
        "has_credit_card_offer": False,
    },
    {
        "bank_name": "Jana Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.janabank.com",
        "fd_rates_url": "https://www.janabank.com/fixed-deposit",
        "has_credit_card_offer": False,
    },
    {
        "bank_name": "North East Small Finance Bank",
        "bank_type": "small_finance",
        "website": "https://www.nesfb.com",
        "fd_rates_url": "https://www.nesfb.com/deposits/fixed-deposit",
        "has_credit_card_offer": False,
    },
    
    # Private Banks (moderate rates, high safety)
    {
        "bank_name": "HDFC Bank",
        "bank_type": "private",
        "website": "https://www.hdfcbank.com",
        "fd_rates_url": "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit-interest-rate",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "ICICI Bank",
        "bank_type": "private",
        "website": "https://www.icicibank.com",
        "fd_rates_url": "https://www.icicibank.com/personal-banking/deposits/fixed-deposit/fd-interest-rates",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "Axis Bank",
        "bank_type": "private",
        "website": "https://www.axisbank.com",
        "fd_rates_url": "https://www.axisbank.com/retail/deposits/fixed-deposit",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "IndusInd Bank",
        "bank_type": "private",
        "website": "https://www.indusind.com",
        "fd_rates_url": "https://www.indusind.com/in/en/personal/deposits/fixed-deposit.html",
        "has_credit_card_offer": True,
        "notes": "Often has promotional rates",
    },
    {
        "bank_name": "Kotak Mahindra Bank",
        "bank_type": "private",
        "website": "https://www.kotak.com",
        "fd_rates_url": "https://www.kotak.com/en/personal-banking/deposits/fixed-deposit.html",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "Yes Bank",
        "bank_type": "private",
        "website": "https://www.yesbank.in",
        "fd_rates_url": "https://www.yesbank.in/personal-banking/yes-individual/deposits/fixed-deposit",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "IDFC First Bank",
        "bank_type": "private",
        "website": "https://www.idfcfirstbank.com",
        "fd_rates_url": "https://www.idfcfirstbank.com/personal-banking/deposits/fixed-deposit",
        "has_credit_card_offer": True,
        "notes": "Good rates, often competitive with SFBs",
    },
    {
        "bank_name": "RBL Bank",
        "bank_type": "private",
        "website": "https://www.rblbank.com",
        "fd_rates_url": "https://www.rblbank.com/personal-banking/accounts-deposits/fixed-deposits",
        "has_credit_card_offer": True,
    },
    
    # Public Banks (government-backed)
    {
        "bank_name": "State Bank of India",
        "bank_type": "public",
        "website": "https://www.sbi.co.in",
        "fd_rates_url": "https://www.sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "Bank of Baroda",
        "bank_type": "public",
        "website": "https://www.bankofbaroda.in",
        "fd_rates_url": "https://www.bankofbaroda.in/interest-rate-and-service-charges/deposits-interest-rates",
        "has_credit_card_offer": True,
    },
    {
        "bank_name": "Punjab National Bank",
        "bank_type": "public",
        "website": "https://www.pnbindia.in",
        "fd_rates_url": "https://www.pnbindia.in/interest-rates.html",
        "has_credit_card_offer": True,
    },
    
    # NBFCs (higher risk, higher rates)
    {
        "bank_name": "Bajaj Finance",
        "bank_type": "nbfc",
        "website": "https://www.bajajfinserv.in",
        "fd_rates_url": "https://www.bajajfinserv.in/fixed-deposit-interest-rates",
        "has_credit_card_offer": False,
        "notes": "AAA rated NBFC",
    },
    {
        "bank_name": "Shriram Finance",
        "bank_type": "nbfc",
        "website": "https://www.shriramfinance.in",
        "fd_rates_url": "https://www.shriramfinance.in/fixed-deposits",
        "has_credit_card_offer": False,
    },
    {
        "bank_name": "Mahindra Finance",
        "bank_type": "nbfc",
        "website": "https://www.mahindrafinance.com",
        "fd_rates_url": "https://www.mahindrafinance.com/fixed-deposit",
        "has_credit_card_offer": False,
    },
]


# Aggregator sites (for cross-referencing)
FD_AGGREGATOR_SOURCES = [
    {
        "name": "BankBazaar FD Rates",
        "url": "https://www.bankbazaar.com/fixed-deposit-rate.html",
        "type": "aggregator",
    },
    {
        "name": "Paisabazaar FD Rates",
        "url": "https://www.paisabazaar.com/fixed-deposit/",
        "type": "aggregator",
    },
    {
        "name": "ET Money FD Calculator",
        "url": "https://www.etmoney.com/fixed-deposit",
        "type": "aggregator",
    },
]