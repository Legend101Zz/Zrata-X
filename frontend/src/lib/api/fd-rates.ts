import { api } from "./client";
import { FDRate, FDRatesResponse } from "./types";

export interface FDRatesFilters {
  bank_type?: string;
  min_tenure?: number;
  max_tenure?: number;
  min_rate?: number;
  sort_by?: "rate" | "tenure" | "bank_name";
  sort_order?: "asc" | "desc";
  limit?: number;
}

export const fdRatesApi = {
  getAll: (filters?: FDRatesFilters) =>
    api.get<FDRatesResponse>("/api/v1/fd-rates", { params: filters }),

  getTop: (limit = 5) =>
    api.get<FDRate[]>("/api/v1/fd-rates/top", { params: { limit } }),

  getByBank: (bankName: string) =>
    api.get<FDRate[]>(`/api/v1/fd-rates/bank/${encodeURIComponent(bankName)}`),

  compare: (bankNames: string[]) =>
    api.post<FDRate[]>("/api/v1/fd-rates/compare", { banks: bankNames }),
};
