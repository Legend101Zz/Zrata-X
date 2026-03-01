import { api } from "./client";
import { MarketSignal } from "./types";

export const signalsApi = {
  getActive: () => api.get<MarketSignal[]>("/api/v1/market/signals/active"),

  getByCategory: (category: string) =>
    api.get<MarketSignal[]>("/api/v1/market/signals/active", {
      params: { category },
    }),
};
