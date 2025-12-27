import { api } from "./client";
import {
  MarketDataResponse,
  InflationData,
  IndexData,
  GoldPrice,
} from "./types";

export const marketDataApi = {
  getAll: () => api.get<MarketDataResponse>("/api/v1/market-data"),

  getInflation: () => api.get<InflationData>("/api/v1/market-data/inflation"),

  getIndices: () => api.get<IndexData[]>("/api/v1/market-data/indices"),

  getGold: () => api.get<GoldPrice>("/api/v1/market-data/gold"),

  getRepoRate: () =>
    api.get<{ rate: number; last_updated: string }>(
      "/api/v1/market-data/repo-rate"
    ),
};
