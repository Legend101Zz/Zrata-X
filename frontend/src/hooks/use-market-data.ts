import { useQuery } from "@tanstack/react-query";
import {
  marketDataApi,
  MarketSnapshot,
  GoldPriceResponse,
  MacroIndicatorResponse,
} from "@/lib/api/market-data";

export const marketDataKeys = {
  all: ["market-data"] as const,
  snapshot: () => [...marketDataKeys.all, "snapshot"] as const,
  gold: (days?: number) => [...marketDataKeys.all, "gold", days] as const,
  silver: (days?: number) => [...marketDataKeys.all, "silver", days] as const,
  macro: () => [...marketDataKeys.all, "macro"] as const,
  news: (category?: string) =>
    [...marketDataKeys.all, "news", category] as const,
  etfs: (underlying?: string) =>
    [...marketDataKeys.all, "etfs", underlying] as const,
};

// Main market snapshot - key indicators
export function useMarketSnapshot() {
  return useQuery({
    queryKey: marketDataKeys.snapshot(),
    queryFn: () => marketDataApi.getSnapshot(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
  });
}

// Gold prices
export function useGoldPrice(days = 7) {
  return useQuery({
    queryKey: marketDataKeys.gold(days),
    queryFn: () => marketDataApi.getGoldSilver("gold", days),
    staleTime: 1000 * 60 * 15, // 15 minutes
    select: (data) => data[0], // Get latest price
  });
}

// Silver prices
export function useSilverPrice(days = 7) {
  return useQuery({
    queryKey: marketDataKeys.silver(days),
    queryFn: () => marketDataApi.getGoldSilver("silver", days),
    staleTime: 1000 * 60 * 15,
    select: (data) => data[0],
  });
}

// Macro indicators (inflation, repo rate, etc.)
export function useMacroIndicators() {
  return useQuery({
    queryKey: marketDataKeys.macro(),
    queryFn: () => marketDataApi.getMacroIndicators(),
    staleTime: 1000 * 60 * 60, // 1 hour - macro data changes slowly
  });
}

// Market news
export function useMarketNews(category?: string, days = 7) {
  return useQuery({
    queryKey: marketDataKeys.news(category),
    queryFn: () => marketDataApi.getNews(category, days),
    staleTime: 1000 * 60 * 15,
  });
}

// ETFs
export function useETFs(underlying?: string) {
  return useQuery({
    queryKey: marketDataKeys.etfs(underlying),
    queryFn: () => marketDataApi.getETFs(underlying),
    staleTime: 1000 * 60 * 30,
  });
}

// Helper: Get specific indicator from macro data
export function useInflation() {
  const { data, ...rest } = useMacroIndicators();
  return {
    ...rest,
    data: data?.find((i) =>
      i.indicator_name.toLowerCase().includes("inflation")
    ),
  };
}

export function useRepoRate() {
  const { data, ...rest } = useMacroIndicators();
  return {
    ...rest,
    data: data?.find((i) => i.indicator_name.toLowerCase().includes("repo")),
  };
}
