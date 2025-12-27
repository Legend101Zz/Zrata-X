import { api } from "./client";
import { AllocationRequest, AllocationResponse } from "./types";

export const allocationApi = {
  generate: (request: AllocationRequest) =>
    api.post<AllocationResponse>("/api/v1/allocation/generate", request),

  // For guest users - simpler endpoint without persistence
  generateGuest: (amount: number, riskProfile?: string) =>
    api.post<AllocationResponse>("/api/v1/allocation/generate-guest", {
      amount,
      risk_profile: riskProfile,
    }),
};
