import { useQuery } from "@tanstack/react-query";
import { marketDataApi } from "@/lib/api/market-data";

export const marketDataKeys = {
  all: ["market-data"] as const,
  inflation: () => [...marketDataKeys.all, "inflation"] as const,
  indices: () => [...marketDataKeys.all, "indices"] as const,
  gold: () => [...marketDataKeys.all, "gold"] as const,
};

export function useMarketData() {
  return useQuery({
    queryKey: marketDataKeys.all,
    queryFn: () => marketDataApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
  });
}

export function useInflation() {
  return useQuery({
    queryKey: marketDataKeys.inflation(),
    queryFn: () => marketDataApi.getInflation(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - monthly data
  });
}

export function useIndices() {
  return useQuery({
    queryKey: marketDataKeys.indices(),
    queryFn: () => marketDataApi.getIndices(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useGoldPrice() {
  return useQuery({
    queryKey: marketDataKeys.gold(),
    queryFn: () => marketDataApi.getGold(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}
