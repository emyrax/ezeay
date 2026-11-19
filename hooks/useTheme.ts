import { useColorScheme } from "react-native";
import {
  darkTheme,
  lightTheme,
  themeFor,
  type ResolvedTheme,
  type ThemeColors,
} from "../constants/themes";
import { resolveThemeMode } from "../lib/theme/resolve";
import { useThemeStore } from "../store/themeStore";

/**
 * Resolves the active theme name from the persisted preference, falling back to
 * the OS color scheme when the user chose "system".
 */
export function useThemeMode(): ResolvedTheme {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();
  return resolveThemeMode(mode, systemScheme);
}

/**
 * Reactive theme tokens. Components re-render automatically when the user
 * switches appearance (light / dark / system).
 */
export function useThemeColors(): ThemeColors {
  return themeFor(useThemeMode());
}

export { darkTheme, lightTheme };
export type { ThemeColors };
