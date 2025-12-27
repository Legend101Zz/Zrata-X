/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API utility functions
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  // Add auth token if available
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.detail || "An error occurred"
    );
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ access_token: string; token_type: string; user: any }>(
      "/auth/login",
      {
        method: "POST",
        body: new URLSearchParams({ username: email, password }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    ),

  register: (data: { email: string; password: string; full_name: string }) =>
    apiRequest<{ access_token: string; token_type: string; user: any }>(
      "/auth/register",
      {
        method: "POST",
        body: data,
      }
    ),

  getMe: () => apiRequest<any>("/auth/me"),

  updateMe: (data: any) =>
    apiRequest<any>("/auth/me", { method: "PATCH", body: data }),
};

// Portfolio API
export const portfolioApi = {
  getHoldings: (userId: number) =>
    apiRequest<any[]>(`/portfolio/holdings?user_id=${userId}`),

  getSummary: (userId: number) =>
    apiRequest<any>(`/portfolio/summary?user_id=${userId}`),

  addHolding: (userId: number, holding: any) =>
    apiRequest<any>(`/portfolio/holdings?user_id=${userId}`, {
      method: "POST",
      body: holding,
    }),

  analyze: (userId: number) =>
    apiRequest<any>(`/portfolio/analyze?user_id=${userId}`, { method: "POST" }),
};

// Recommendations API
export const recommendApi = {
  getInvestmentSuggestion: (
    userId: number,
    data: {
      amount: number;
      risk_override?: string;
      avoid_lock_ins?: boolean;
      prefer_tax_saving?: boolean;
      include_fds?: boolean;
      include_gold?: boolean;
    }
  ) =>
    apiRequest<any>(`/recommend/invest?user_id=${userId}`, {
      method: "POST",
      body: data,
    }),

  backtest: (userId: number, strategy: any, years: number) =>
    apiRequest<any>(`/recommend/backtest?user_id=${userId}&years=${years}`, {
      method: "POST",
      body: strategy,
    }),
};

// Market Data API
export const marketApi = {
  getSnapshot: () => apiRequest<any>("/market/snapshot"),

  getFDRates: (params?: {
    bank_type?: string;
    min_rate?: number;
    tenure_days?: number;
    with_credit_card?: boolean;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return apiRequest<any[]>(`/market/fd-rates?${searchParams}`);
  },

  getMutualFunds: (params?: {
    search?: string;
    category?: string;
    amc?: string;
    plan_type?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return apiRequest<any[]>(`/market/mutual-funds?${searchParams}`);
  },

  getMutualFundDetails: (schemeCode: string, includeHistory?: boolean) =>
    apiRequest<any>(
      `/market/mutual-funds/${schemeCode}?include_history=${
        includeHistory || false
      }`
    ),

  getETFs: (underlying?: string) =>
    apiRequest<any[]>(
      `/market/etfs${underlying ? `?underlying=${underlying}` : ""}`
    ),

  getGoldSilverPrices: (metalType?: string, days?: number) => {
    const params = new URLSearchParams();
    if (metalType) params.append("metal_type", metalType);
    if (days) params.append("days", String(days));
    return apiRequest<any[]>(`/market/gold-silver?${params}`);
  },

  getNews: (params?: { category?: string; days?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return apiRequest<any[]>(`/market/news?${searchParams}`);
  },

  getMacroIndicators: () => apiRequest<any[]>("/market/macro-indicators"),

  getDigitalGoldProviders: () => apiRequest<any[]>("/market/digital-gold"),

  triggerRefresh: (
    dataType: "fd_rates" | "mf_nav" | "gold_prices" | "news" | "all"
  ) =>
    apiRequest<any>(`/market/refresh?data_type=${dataType}`, {
      method: "POST",
    }),
};

export { apiRequest, ApiError };
