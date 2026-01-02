import { useMutation } from "@tanstack/react-query";
import { recommendationsApi } from "@/lib/api/recommendations";
import {
  RecommendationRequest,
  GuestRecommendationRequest,
  RecommendationResponse,
  GuestRecommendationResponse,
} from "@/lib/api/types";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "@/hooks/use-toast";

export function useRecommendation() {
  const { user, isAuthenticated } = useAuthStore();

  return useMutation<
    RecommendationResponse | GuestRecommendationResponse,
    Error,
    RecommendationRequest | GuestRecommendationRequest
  >({
    mutationFn: async (request) => {
      if (isAuthenticated && user?.id) {
        // Authenticated user
        return recommendationsApi.getRecommendation(
          Number(user.id),
          request as RecommendationRequest
        );
      }

      // Guest user
      return recommendationsApi.getGuestRecommendation(
        request as GuestRecommendationRequest
      );
    },
    onError: (error) => {
      toast({
        title: "Failed to generate recommendations",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });
}
// Specific hook for guest users
export function useGuestRecommendation() {
  return useMutation({
    mutationFn: (request: GuestRecommendationRequest) =>
      recommendationsApi.getGuestRecommendation(request),
    onError: (error) => {
      toast({
        title: "Failed to generate recommendations",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });
}
