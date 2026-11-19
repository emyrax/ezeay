import { Platform } from "react-native";
import type { ResolvedTheme } from "../lib/theme/resolve";

export const safeFont = "SpaceGrotesk";
export const fontFamily = "SpaceGrotesk";
export const bodyFont = Platform.OS === "ios" ? "System" : safeFont;
export const timersFont = bodyFont;

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  glass: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  border: string;
  borderLight: string;
  cardBg: string;
  cardBgLight: string;
  tabBg: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  shadow: string;
}

/** Dark palette — the original, always-dark "deep ocean blue" theme. */
export const appTheme: ThemeColors = {
  bg: "#152A4D",
  surface: "#1B3560",
  surfaceAlt: "#213E6E",
  glass: "rgba(27, 53, 96, 0.85)",
  text: "#ffffff",
  textSecondary: "#b5cee2",
  textMuted: "#a2aab3",
  primary: "#2d8dfc",
  primaryLight: "rgba(149, 208, 253, 0.16)",
  accent: "#1c9bfc",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#1596f8",
  border: "#2D4E7F",
  borderLight: "#213A60",
  cardBg: "#1B3560",
  cardBgLight: "#213E6E",
  tabBg: "rgba(21, 42, 77, 0.92)",
  tabBorder: "#2D4E7F",
  tabActive: "#088bf0",
  tabInactive: "#5F8FBF",
  gradientStart: "#f8fcff",
  gradientMid: "#0487eb",
  gradientEnd: "#068ff7",
  shadow: "#058ff8",
};

/**
 * Light palette — "Iris" premium light theme.
 *
 * Inspired by the Coach surface (soft neutrals + a calm indigo accent) and
 * elevated into a confident, premium violet. `primary` (#6D5BF5) clears 4.5:1
 * against both white and dark text so it reads as an accessible accent fill and
 * accent-on-surface text.
 */
export const lightTheme: ThemeColors = {
  bg: "#F5F6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F8",
  glass: "rgba(255, 255, 255, 0.82)",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  primary: "#6D5BF5",
  primaryLight: "rgba(109, 91, 245, 0.12)",
  accent: "#8B7EF8",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#4F46E5",
  border: "#E4E7F0",
  borderLight: "#EEF1F7",
  cardBg: "#FFFFFF",
  cardBgLight: "#F5F6FB",
  tabBg: "rgba(255, 255, 255, 0.92)",
  tabBorder: "#E4E7F0",
  tabActive: "#6D5BF5",
  tabInactive: "#64748B",
  gradientStart: "#A78BFA",
  gradientMid: "#7C6CF8",
  gradientEnd: "#6D5BF5",
  shadow: "#6D5BF5",
};

/** Backwards-compatible alias — `appTheme` is the dark theme. */
export const darkTheme = appTheme;

export type { ResolvedTheme };

export function themeFor(resolved: ResolvedTheme): ThemeColors {
  return resolved === "light" ? lightTheme : appTheme;
}
