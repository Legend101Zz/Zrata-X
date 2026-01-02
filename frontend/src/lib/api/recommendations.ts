import { api } from "./client";
import {
  RecommendationRequest,
  RecommendationResponse,
  GuestRecommendationRequest,
  GuestRecommendationResponse,
} from "./types";

export const recommendationsApi = {
  // For authenticated users - includes portfolio context
  getRecommendation: (userId: number, request: RecommendationRequest) =>
    api.post<RecommendationResponse>(
      `/api/v1/recommend/invest?user_id=${userId}`,
      request
    ),

  // For guest users - no portfolio context
  getGuestRecommendation: (request: GuestRecommendationRequest) =>
    api.post<GuestRecommendationResponse>(
      "/api/v1/recommend/invest/guest",
      request
    ),
};
