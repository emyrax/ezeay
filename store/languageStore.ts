import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { detectDeviceAppLanguage } from "../lib/i18n/detect";
import {
  isAppLanguage,
  normalizeLanguageCode,
  type AppLanguageCode,
} from "../lib/i18n/languages";

export const LANGUAGE_STORAGE_KEY = "@yuinx_language_v1";

interface LanguageState {
  appLanguage: AppLanguageCode;
  hasExplicitChoice: boolean;
  hydrated: boolean;
  setAppLanguage: (code: string, options?: { explicit?: boolean }) => void;
  reset: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      appLanguage: detectDeviceAppLanguage(),
      hasExplicitChoice: false,
      hydrated: false,
      setAppLanguage: (code, options) => {
        const normalized = normalizeLanguageCode(code);
        if (!isAppLanguage(normalized)) return;
        set({
          appLanguage: normalized,
          hasExplicitChoice: options?.explicit ?? true,
        });
      },
      reset: () =>
        set({
          appLanguage: detectDeviceAppLanguage(),
          hasExplicitChoice: false,
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        appLanguage: state.appLanguage,
        hasExplicitChoice: state.hasExplicitChoice,
      }),
      onRehydrateStorage: () => () => {
        useLanguageStore.setState({ hydrated: true });
      },
    },
  ),
);
