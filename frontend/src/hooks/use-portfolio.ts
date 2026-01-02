import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api/portfolio";
import { CreateHoldingInput } from "@/lib/api/types";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "@/hooks/use-toast";

export const portfolioKeys = {
  all: ["portfolio"] as const,
  holdings: (userId: number) =>
    [...portfolioKeys.all, "holdings", userId] as const,
  summary: (userId: number) =>
    [...portfolioKeys.all, "summary", userId] as const,
};

export function useHoldings() {
  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.id ? parseInt(user.id) : 0;

  return useQuery({
    queryKey: portfolioKeys.holdings(userId),
    queryFn: () => portfolioApi.getHoldings(userId),
    enabled: isAuthenticated && userId > 0,
  });
}

export function usePortfolioSummary() {
  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.id ? parseInt(user.id) : 0;

  return useQuery({
    queryKey: portfolioKeys.summary(userId),
    queryFn: () => portfolioApi.getSummary(userId),
    enabled: isAuthenticated && userId > 0,
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id ? parseInt(user.id) : 0;

  return useMutation({
    mutationFn: (data: CreateHoldingInput) =>
      portfolioApi.addHolding(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
      toast({
        title: "Holding added",
        description: "Your holding has been added to your portfolio.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add holding",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id ? parseInt(user.id) : 0;

  return useMutation({
    mutationFn: (holdingId: string) =>
      portfolioApi.deleteHolding(userId, holdingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
      toast({
        title: "Holding deleted",
        description: "Your holding has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete holding",
        variant: "destructive",
      });
    },
  });
}
