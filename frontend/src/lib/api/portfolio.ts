import { api } from "./client";
import { Holding, PortfolioSummary, CreateHoldingInput } from "./types";

export const portfolioApi = {
  getHoldings: (userId: number) =>
    api.get<Holding[]>(`/api/v1/portfolio/holdings?user_id=${userId}`),

  getSummary: (userId: number) =>
    api.get<PortfolioSummary>(`/api/v1/portfolio/summary?user_id=${userId}`),

  addHolding: (userId: number, data: CreateHoldingInput) =>
    api.post<Holding>(`/api/v1/portfolio/holdings?user_id=${userId}`, data),

  updateHolding: (
    userId: number,
    holdingId: string,
    data: Partial<CreateHoldingInput>
  ) =>
    api.put<Holding>(
      `/api/v1/portfolio/holdings/${holdingId}?user_id=${userId}`,
      data
    ),

  deleteHolding: (userId: number, holdingId: string) =>
    api.delete<void>(
      `/api/v1/portfolio/holdings/${holdingId}?user_id=${userId}`
    ),
};
