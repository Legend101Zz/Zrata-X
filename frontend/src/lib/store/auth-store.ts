import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setGuest: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: true,
      setUser: (user) =>
        set({ user, isAuthenticated: true, isGuest: false, isLoading: false }),
      setGuest: () =>
        set({
          user: null,
          isAuthenticated: false,
          isGuest: true,
          isLoading: false,
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          isLoading: false,
        }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "zrata-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);
