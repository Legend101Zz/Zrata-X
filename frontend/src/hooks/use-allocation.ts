import { useMutation } from "@tanstack/react-query";
import { allocationApi } from "@/lib/api/allocation";
import { AllocationRequest, AllocationResponse } from "@/lib/api/types";
import { useAuthStore } from "@/lib/store/auth-store";

export function useGenerateAllocation() {
  const { isAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: (request: AllocationRequest) => {
      if (isAuthenticated) {
        return allocationApi.generate(request);
      }
      return allocationApi.generateGuest(request.amount, request.risk_profile);
    },
  });
}

// Hook for simple guest allocation
export function useGuestAllocation() {
  return useMutation({
    mutationFn: ({
      amount,
      riskProfile,
    }: {
      amount: number;
      riskProfile?: string;
    }) => allocationApi.generateGuest(amount, riskProfile),
  });
}
