import { api } from "./client";

// Response type matching backend FDRateResponse schema
export interface FDRateResponse {
  id: number;
  bank_name: string;
  bank_type: string;
  tenure_display: string;
  interest_rate_general: number;
  interest_rate_senior: number | null;
  has_credit_card_offer: boolean;
  special_features: Record<string, unknown> | null;
}

export interface FDRatesFilters {
  bank_type?: "small_finance" | "private" | "public";
  min_rate?: number;
  tenure_days?: number;
  with_credit_card?: boolean;
  limit?: number;
}

export const fdRatesApi = {
  // Get FD rates with filters (sorted by rate desc by default)
  getAll: (filters?: FDRatesFilters) =>
    api.get<FDRateResponse[]>("/api/v1/market/fd-rates", { params: filters }),

  // Get top N FD rates (convenience method)
  getTop: (limit = 5) =>
    api.get<FDRateResponse[]>("/api/v1/market/fd-rates", { params: { limit } }),

  // Get best small finance bank rates
  getSmallFinanceBanks: (limit = 10) =>
    api.get<FDRateResponse[]>("/api/v1/market/fd-rates", {
      params: { bank_type: "small_finance", limit },
    }),

  // Get FDs with credit card offers
  getWithCreditCard: (limit = 10) =>
    api.get<FDRateResponse[]>("/api/v1/market/fd-rates", {
      params: { with_credit_card: true, limit },
    }),
};
