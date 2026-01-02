import { api } from "./client";

// Response types matching backend schemas
export interface MarketSnapshot {
  repo_rate: number | null;
  inflation_rate: number | null;
  gold_price_per_gram: number | null;
  silver_price_per_gram: number | null;
  nifty_pe_ratio: number | null;
  market_sentiment: string | null;
  last_updated: string;
}

export interface GoldPriceResponse {
  metal_type: string;
  price_per_gram: number;
  price_per_10g: number;
  recorded_at: string;
}

export interface MacroIndicatorResponse {
  indicator_name: string;
  value: number;
  previous_value: number | null;
  change_percent: number | null;
  unit: string;
  recorded_at: string;
}

export interface NewsResponse {
  id: number;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  published_at: string;
  sentiment_score: number | null;
  categories: string[];
}

export interface ETFResponse {
  symbol: string;
  name: string;
  underlying: string;
  nav: number;
  market_price: number;
  premium_discount: number;
  expense_ratio: number | null;
}

export const marketDataApi = {
  // Get market snapshot (key indicators)
  getSnapshot: () => api.get<MarketSnapshot>("/api/v1/market/snapshot"),

  // Get gold/silver prices
  getGoldSilver: (metalType?: "gold" | "silver", days = 7) =>
    api.get<GoldPriceResponse[]>("/api/v1/market/gold-silver", {
      params: { metal_type: metalType, days },
    }),

  // Get macro indicators (inflation, repo rate, etc.)
  getMacroIndicators: () =>
    api.get<MacroIndicatorResponse[]>("/api/v1/market/macro-indicators"),

  // Get market news
  getNews: (category?: string, days = 7, limit = 20) =>
    api.get<NewsResponse[]>("/api/v1/market/news", {
      params: { category, days, limit },
    }),

  // Get ETFs
  getETFs: (underlying?: string) =>
    api.get<ETFResponse[]>("/api/v1/market/etfs", {
      params: { underlying },
    }),

  // Get digital gold providers
  getDigitalGold: () => api.get<unknown[]>("/api/v1/market/digital-gold"),
};
