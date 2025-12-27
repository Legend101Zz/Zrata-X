import { api } from "./client";
import { Holding, PortfolioSummary, CreateHoldingInput } from "./types";

export const portfolioApi = {
  getHoldings: () => api.get<Holding[]>("/api/v1/portfolio/holdings"),

  getSummary: () => api.get<PortfolioSummary>("/api/v1/portfolio/summary"),

  addHolding: (data: CreateHoldingInput) =>
    api.post<Holding>("/api/v1/portfolio/holdings", data),

  updateHolding: (id: string, data: Partial<CreateHoldingInput>) =>
    api.put<Holding>(`/api/v1/portfolio/holdings/${id}`, data),

  deleteHolding: (id: string) =>
    api.delete<void>(`/api/v1/portfolio/holdings/${id}`),

  bulkUpdate: (holdings: { id: string; current_value: number }[]) =>
    api.post<Holding[]>("/api/v1/portfolio/holdings/bulk-update", { holdings }),
};
