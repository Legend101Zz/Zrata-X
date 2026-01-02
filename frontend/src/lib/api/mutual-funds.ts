import { api } from "./client";

export interface MutualFundResponse {
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  category: string;
  plan_type: string;
  nav: number;
  nav_date: string | null;
  return_1y: number | null;
  expense_ratio: number | null;
}

export interface MutualFundFilters {
  search?: string;
  category?: string;
  amc?: string;
  plan_type?: "direct" | "regular";
  sort_by?: "nav" | "return_1y" | "return_3y" | "aum";
  limit?: number;
}

export const mutualFundsApi = {
  // Search and filter mutual funds
  search: (filters?: MutualFundFilters) =>
    api.get<MutualFundResponse[]>("/api/v1/market/mutual-funds", {
      params: filters,
    }),

  // Get specific mutual fund details
  getDetails: (schemeCode: string, includeHistory = false, historyDays = 365) =>
    api.get<MutualFundResponse & { nav_history?: unknown[] }>(
      `/api/v1/market/mutual-funds/${schemeCode}`,
      { params: { include_history: includeHistory, history_days: historyDays } }
    ),
};
