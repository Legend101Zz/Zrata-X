import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api/portfolio";
import { CreateHoldingInput } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";

export const portfolioKeys = {
  all: ["portfolio"] as const,
  holdings: () => [...portfolioKeys.all, "holdings"] as const,
  summary: () => [...portfolioKeys.all, "summary"] as const,
};

export function useHoldings() {
  return useQuery({
    queryKey: portfolioKeys.holdings(),
    queryFn: () => portfolioApi.getHoldings(),
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: portfolioKeys.summary(),
    queryFn: () => portfolioApi.getSummary(),
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHoldingInput) => portfolioApi.addHolding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
      toast({
        title: "Holding added",
        description: "Your holding has been added to your portfolio.",
        variant: "success",
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

export function useUpdateHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateHoldingInput>;
    }) => portfolioApi.updateHolding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
      toast({
        title: "Holding updated",
        description: "Your holding has been updated.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update holding",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => portfolioApi.deleteHolding(id),
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
