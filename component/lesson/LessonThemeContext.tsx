import React, { createContext, useContext, type ReactNode } from "react";
import type { ThemeColors } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";

const LessonThemeContext = createContext<ThemeColors | null>(null);

export function LessonThemeProvider({
  theme,
  children,
}: {
  theme: ThemeColors;
  children: ReactNode;
}) {
  return (
    <LessonThemeContext.Provider value={theme}>
      {children}
    </LessonThemeContext.Provider>
  );
}

export function useLessonTheme(): ThemeColors {
  const appTheme = useThemeColors();
  const override = useContext(LessonThemeContext);
  return override ?? appTheme;
}
