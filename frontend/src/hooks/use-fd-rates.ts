import { useQuery } from "@tanstack/react-query";
import { fdRatesApi, FDRatesFilters } from "@/lib/api/fd-rates";

export const fdRatesKeys = {
  all: ["fd-rates"] as const,
  list: (filters?: FDRatesFilters) =>
    [...fdRatesKeys.all, "list", filters] as const,
  top: (limit?: number) => [...fdRatesKeys.all, "top", limit] as const,
  bank: (name: string) => [...fdRatesKeys.all, "bank", name] as const,
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

export function useFDRatesByBank(bankName: string) {
  return useQuery({
    queryKey: fdRatesKeys.bank(bankName),
    queryFn: () => fdRatesApi.getByBank(bankName),
    enabled: !!bankName,
  });
}
