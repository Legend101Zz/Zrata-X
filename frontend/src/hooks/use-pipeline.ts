import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { PipelineResponse } from "@/lib/api/types";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "@/hooks/use-toast";

interface PipelineRequest {
  amount: number;
  risk_override?: string;
  preferences_override?: Record<string, unknown>;
}

export function usePipelineRecommendation() {
  const { user, isAuthenticated } = useAuthStore();

  return useMutation<PipelineResponse, Error, PipelineRequest>({
    mutationFn: async (request) => {
      if (isAuthenticated && user?.id) {
        return api.post<PipelineResponse>(
          `/api/v1/recommend/pipeline?user_id=${user.id}`,
          request,
        );
      }
      // Guest fallback — same endpoint, no user context
      return api.post<PipelineResponse>(
        "/api/v1/recommend/pipeline/guest",
        request,
      );
    },
    onError: (error) => {
      toast({
        title: "Couldn't generate your plan",
        description: error.message || "Please try again in a moment",
        variant: "destructive",
      });
    },
  });
}
