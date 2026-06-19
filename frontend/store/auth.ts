import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";

interface User {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
  plan?: string;
  plan_expires_at?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  socialLogin: (provider: "google" | "facebook", token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const data = await api.post<{
          access_token: string;
          user: User;
        }>("/auth/login", { email, password });
        set({ token: data.access_token, user: data.user });
      },

      register: async (name, email, password) => {
        const data = await api.post<{
          access_token: string;
          user: User;
        }>("/auth/register", { name, email, password });
        set({ token: data.access_token, user: data.user });
      },

      socialLogin: async (provider, token) => {
        const data = await api.post<{
          access_token: string;
          user: User;
        }>(`/auth/${provider}`, { token });
        set({ token: data.access_token, user: data.user });
      },

      refreshUser: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        try {
          const data = await api.get<User>("/auth/me");
          set({ user: data });
        } catch {}
      },

      logout: () => set({ token: null, user: null }),
    }),
    { name: "auth-storage" },
  ),
);
