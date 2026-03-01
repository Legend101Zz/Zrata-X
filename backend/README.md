Start :

```bash
brew services start postgresql@16
```

cd to backend

```
make dev
```

# 1. Populate base data (existing scrapers)
python -m app.scripts.run_all_scrapers --type all -v

# 2. Ingest RSS feeds + process into signals
python -m app.scripts.run_rss_and_signals --step all

# 3. (Optional) Just RSS without LLM signal processing
python -m app.scripts.run_rss_and_signals --step rss

# 4. (Optional) Just re-process unprocessed news into signals
python -m app.scripts.run_rss_and_signals --step signals

# 5. Run the full pipeline test
python -m tests.test_pipeline
```

**Expected flow:**
```
run_all_scrapers (MF, FD, Gold, ETF, Macro, News via Crawl4AI)
       ↓  populates: mutual_funds, fixed_deposit_rates, gold_silver_prices, etfs, macro_indicators, market_news

run_rss_and_signals --step rss
       ↓  populates: market_news (additional articles from RSS feeds)

run_rss_and_signals --step signals  
       ↓  reads: market_news (unprocessed, sentiment_score IS NULL)
       ↓  calls: LLM (FAST_MODEL) in batches of 20
       ↓  populates: market_signals (structured, queryable signals)

test_pipeline
       ↓  runs: full RecommendationPipeline.generate()
       ↓  reads: market_signals + portfolio + user preferences
       ↓  calls: LLM 3x (strategy → validation → explanation)
       ↓  outputs: allocation with ₹ amounts