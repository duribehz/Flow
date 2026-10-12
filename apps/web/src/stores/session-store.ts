import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

export interface SessionUser {
  id: string;
  email: string;
}

interface SessionState {
  user: SessionUser | null;
  theme: ThemePreference;
  setUser: (user: SessionUser) => void;
  clearSession: () => void;
  setTheme: (theme: ThemePreference) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      theme: "system",
      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "flow-preferences",
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);
