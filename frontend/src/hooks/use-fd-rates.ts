import { useQuery } from "@tanstack/react-query";
import { fdRatesApi, FDRatesFilters, FDRateResponse } from "@/lib/api/fd-rates";

export const fdRatesKeys = {
  all: ["fd-rates"] as const,
  list: (filters?: FDRatesFilters) =>
    [...fdRatesKeys.all, "list", filters] as const,
  top: (limit?: number) => [...fdRatesKeys.all, "top", limit] as const,
  smallFinance: (limit?: number) =>
    [...fdRatesKeys.all, "small-finance", limit] as const,
  withCreditCard: (limit?: number) =>
    [...fdRatesKeys.all, "credit-card", limit] as const,
};

export function useFDRates(filters?: FDRatesFilters) {
  return useQuery({
    queryKey: fdRatesKeys.list(filters),
    queryFn: () => fdRatesApi.getAll(filters),
    staleTime: 1000 * 60 * 60, // 1 hour - FD rates don't change often
  });
}

export function useTopFDRates(limit = 5) {
  return useQuery({
    queryKey: fdRatesKeys.top(limit),
    queryFn: () => fdRatesApi.getTop(limit),
    staleTime: 1000 * 60 * 60,
  });
}

export function useSmallFinanceBankRates(limit = 10) {
  return useQuery({
    queryKey: fdRatesKeys.smallFinance(limit),
    queryFn: () => fdRatesApi.getSmallFinanceBanks(limit),
    staleTime: 1000 * 60 * 60,
  });
}

export function useFDsWithCreditCard(limit = 10) {
  return useQuery({
    queryKey: fdRatesKeys.withCreditCard(limit),
    queryFn: () => fdRatesApi.getWithCreditCard(limit),
    staleTime: 1000 * 60 * 60,
  });
}
