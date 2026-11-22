import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

interface SessionState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "flow-preferences",
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);
