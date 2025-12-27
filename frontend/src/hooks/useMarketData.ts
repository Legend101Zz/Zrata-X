/**
 * Custom hook for fetching market data
 */
"use client";

import { useState, useEffect, useCallback } from "react";

interface MarketSnapshot {
  repo_rate: number | null;
  inflation_cpi: number | null;
  gold_price_per_gram: number | null;
  gold_price_per_10g: number | null;
  gold_weekly_change_percent: number | null;
  silver_price_per_gram: number | null;
  silver_weekly_change_percent: number | null;
  nifty50_pe_ratio: number | null;
  market_valuation: string | null;
  market_sentiment: {
    overall: string;
    score: number;
    news_count: number;
    by_category: Record<string, number>;
  };
  fd_rates: {
    best_overall_rate: number | null;
    best_overall_bank: string | null;
    short_term_best: {
      rate: number | null;
      bank: string | null;
      tenure: string | null;
    };
    medium_term_best: {
      rate: number | null;
      bank: string | null;
      tenure: string | null;
    };
    long_term_best: {
      rate: number | null;
      bank: string | null;
      tenure: string | null;
    };
    with_credit_card_offer: Array<{ bank: string; rate: number }>;
  };
  last_updated: string;
}

interface FDRate {
  id: number;
  bank_name: string;
  bank_type: string;
  tenure_display: string;
  interest_rate_general: number;
  interest_rate_senior: number | null;
  has_credit_card_offer: boolean;
  special_features: Record<string, any> | null;
}

interface NewsItem {
  id: number;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  published_at: string;
  sentiment_score: number | null;
  categories: string[];
}

interface UseMarketDataReturn {
  snapshot: MarketSnapshot | null;
  fdRates: FDRate[] | null;
  news: NewsItem[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function useMarketData(): UseMarketDataReturn {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [fdRates, setFdRates] = useState<FDRate[] | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [snapshotRes, fdRes, newsRes] = await Promise.all([
        fetch(`${API_BASE}/market/snapshot`),
        fetch(`${API_BASE}/market/fd-rates?limit=10`),
        fetch(`${API_BASE}/market/news?days=7&limit=10`),
      ]);

      // Check for errors
      if (!snapshotRes.ok) throw new Error("Failed to fetch market snapshot");
      if (!fdRes.ok) throw new Error("Failed to fetch FD rates");
      if (!newsRes.ok) throw new Error("Failed to fetch news");

      // Parse responses
      const [snapshotData, fdData, newsData] = await Promise.all([
        snapshotRes.json(),
        fdRes.json(),
        newsRes.json(),
      ]);

      setSnapshot(snapshotData);
      setFdRates(fdData);
      setNews(newsData);
    } catch (err) {
      console.error("Error fetching market data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    snapshot,
    fdRates,
    news,
    loading,
    error,
    refetch: fetchData,
  };
}
