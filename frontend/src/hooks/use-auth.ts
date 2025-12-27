import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { LoginInput, SignupInput } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function useLogin() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (response) => {
      localStorage.setItem("zrata-token", response.token);
      setUser(response.user);
      toast({
        title: "Welcome back!",
        description: `Signed in as ${response.user.email}`,
        variant: "success",
      });
      router.push("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });
}

export function useSignup() {
  const { setUser } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignupInput) => authApi.signup(data),
    onSuccess: (response) => {
      localStorage.setItem("zrata-token", response.token);
      setUser(response.user);
      toast({
        title: "Account created!",
        description: "Welcome to Zrata-X",
        variant: "success",
      });
      router.push("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem("zrata-token");
      logout();
      queryClient.clear();
      router.push("/");
    },
    onSettled: () => {
      // Even if logout API fails, clear local state
      localStorage.removeItem("zrata-token");
      logout();
    },
  });
}

export function useCurrentUser() {
  const { setUser, logout } = useAuthStore();

  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const token = localStorage.getItem("zrata-token");
      if (!token) throw new Error("No token");
      return authApi.me();
    },
    retry: false,
    enabled:
      typeof window !== "undefined" && !!localStorage.getItem("zrata-token"),
  });
}
