import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ThemeMode } from "../lib/theme/resolve";

export type { ThemeMode };

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  reset: () => void;
}

const THEME_KEY = "@yuinx_theme_v1";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light" || value === "system";
}

/**
 * Persisted appearance preference. Defaults to "dark" so the app keeps its
 * original look until a user opts into light or follows the system setting.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      setMode: (mode) => set({ mode: isThemeMode(mode) ? mode : "dark" }),
      reset: () => set({ mode: "dark" }),
    }),
    {
      name: THEME_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
