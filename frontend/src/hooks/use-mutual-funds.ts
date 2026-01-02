import { useQuery } from "@tanstack/react-query";
import { mutualFundsApi, MutualFundFilters } from "@/lib/api/mutual-funds";

export const mutualFundKeys = {
  all: ["mutual-funds"] as const,
  search: (filters?: MutualFundFilters) =>
    [...mutualFundKeys.all, "search", filters] as const,
  details: (schemeCode: string) =>
    [...mutualFundKeys.all, "details", schemeCode] as const,
};

export function useMutualFunds(filters?: MutualFundFilters) {
  return useQuery({
    queryKey: mutualFundKeys.search(filters),
    queryFn: () => mutualFundsApi.search(filters),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useMutualFundDetails(
  schemeCode: string,
  includeHistory = false
) {
  return useQuery({
    queryKey: mutualFundKeys.details(schemeCode),
    queryFn: () => mutualFundsApi.getDetails(schemeCode, includeHistory),
    enabled: !!schemeCode,
    staleTime: 1000 * 60 * 15,
  });
}
