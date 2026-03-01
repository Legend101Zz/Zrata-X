import { useQuery } from "@tanstack/react-query";
import { signalsApi } from "@/lib/api/signals";

export const signalKeys = {
  all: ["signals"] as const,
  active: () => [...signalKeys.all, "active"] as const,
  byCategory: (cat: string) => [...signalKeys.all, "category", cat] as const,
};

export function useActiveSignals() {
  return useQuery({
    queryKey: signalKeys.active(),
    queryFn: () => signalsApi.getActive(),
    staleTime: 1000 * 60 * 15, // 15 min — signals don't change fast
  });
}

export function useSignalsByCategory(category: string) {
  return useQuery({
    queryKey: signalKeys.byCategory(category),
    queryFn: () => signalsApi.getByCategory(category),
    staleTime: 1000 * 60 * 15,
    enabled: !!category,
  });
}
