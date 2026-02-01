import { api } from "./client";
import { LoginInput, SignupInput, AuthResponse, User } from "./types";

// Backend returns this format
interface BackendAuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    risk_tolerance: string;
    investment_horizon_years: number;
    monthly_investment_capacity: number | null;
    created_at: string;
  };
}

// Transform backend response to frontend format
function transformAuthResponse(backend: BackendAuthResponse): AuthResponse {
  return {
    token: backend.access_token,
    user: {
      id: String(backend.user.id),
      email: backend.user.email,
      name: backend.user.full_name,
      created_at: backend.user.created_at,
    },
  };
}

export const authApi = {
  // Login uses OAuth2 form format
  login: async (data: LoginInput): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append("username", data.email); // OAuth2 uses 'username'
    formData.append("password", data.password);

    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      }/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Login failed");
    }

    const backend: BackendAuthResponse = await response.json();
    return transformAuthResponse(backend);
  },

  // Signup - note the endpoint is /register, not /signup
  signup: async (data: SignupInput): Promise<AuthResponse> => {
    const backend = await api.post<BackendAuthResponse>(
      "/api/v1/auth/register",
      {
        email: data.email,
        password: data.password,
        full_name: data.name, // Backend expects full_name
      }
    );
    return transformAuthResponse(backend);
  },

  logout: () => api.post<void>("/api/v1/auth/logout"),

  me: async (): Promise<User> => {
    const backend = await api.get<BackendAuthResponse["user"]>(
      "/api/v1/auth/me"
    );
    return {
      id: String(backend.id),
      email: backend.email,
      name: backend.full_name,
      created_at: backend.created_at,
    };
  },
};
