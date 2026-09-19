import { useThemeStore } from "../store/themeStore";
import { themes, deriveTheme } from "../constants/themes";
import type { ThemeColors } from "../constants/themes";

export function useThemeColors(): ThemeColors {
  const themeId = useThemeStore((s) => s.themeId);
  const customTheme = useThemeStore((s) => s.customTheme);

  if (themeId === "custom" && customTheme) {
    return deriveTheme(customTheme.colors);
  }

  return themes[themeId] ?? themes.hero;
}
