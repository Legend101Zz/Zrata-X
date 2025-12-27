import { api } from "./client";
import { LoginInput, SignupInput, AuthResponse, User } from "./types";

export const authApi = {
  login: (data: LoginInput) =>
    api.post<AuthResponse>("/api/v1/auth/login", data),

  signup: (data: SignupInput) =>
    api.post<AuthResponse>("/api/v1/auth/signup", data),

  logout: () => api.post<void>("/api/v1/auth/logout"),

  me: () => api.get<User>("/api/v1/auth/me"),

  refreshToken: () => api.post<{ token: string }>("/api/v1/auth/refresh"),
};
