import { appTheme } from "../constants/themes";
import type { ThemeColors } from "../constants/themes";

export function useThemeColors(): ThemeColors {
  return appTheme;
}
