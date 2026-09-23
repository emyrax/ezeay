import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomThemeColors } from "../constants/themes";

interface CustomThemeData {
  name: string;
  colors: CustomThemeColors;
}

interface ThemeState {
  themeId: string;
  customTheme: CustomThemeData | null;
  setTheme: (id: string) => void;
  saveCustomTheme: (name: string, colors: CustomThemeColors) => void;
  deleteCustomTheme: () => void;
  reset: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: "hero",
      customTheme: null,
      setTheme: (themeId) => set({ themeId }),
      saveCustomTheme: (name, colors) => set({ themeId: "custom", customTheme: { name, colors } }),
      deleteCustomTheme: () => set({ themeId: "hero", customTheme: null }),
      reset: () => set({ themeId: "hero", customTheme: null }),
    }),
    {
      name: "yuinx-theme",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
