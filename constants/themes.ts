import { Platform } from "react-native";

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

export const appTheme: ThemeColors = {
  bg: "#152A4D",
  surface: "#1B3560",
  surfaceAlt: "#213E6E",
  glass: "rgba(27, 53, 96, 0.85)",
  text: "#ffffff",
  textSecondary: "#148cee",
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
