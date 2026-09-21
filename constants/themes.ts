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

export interface CustomThemeColors {
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  border: string;
  tabActive: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: string, amount: number): string {
  const r = Math.max(
    0,
    parseInt(hex.slice(1, 3), 16) - Math.round(255 * amount),
  );
  const g = Math.max(
    0,
    parseInt(hex.slice(3, 5), 16) - Math.round(255 * amount),
  );
  const b = Math.max(
    0,
    parseInt(hex.slice(5, 7), 16) - Math.round(255 * amount),
  );
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(
    255,
    parseInt(hex.slice(1, 3), 16) + Math.round(255 * amount),
  );
  const g = Math.min(
    255,
    parseInt(hex.slice(3, 5), 16) + Math.round(255 * amount),
  );
  const b = Math.min(
    255,
    parseInt(hex.slice(5, 7), 16) + Math.round(255 * amount),
  );
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function deriveTheme(custom: CustomThemeColors): ThemeColors {
  return {
    bg: custom.bg,
    surface: custom.surface,
    surfaceAlt: darken(custom.surface, 0.03),
    glass: hexToRgba(custom.surface, 0.85),
    text: custom.text,
    textSecondary: custom.textSecondary,
    textMuted: hexToRgba(custom.textSecondary, 0.6),
    primary: custom.primary,
    primaryLight: hexToRgba(custom.primary, 0.14),
    accent: custom.accent,
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#06B6D4",
    border: custom.border,
    borderLight: hexToRgba(custom.border, 0.5),
    cardBg: custom.surface,
    cardBgLight: darken(custom.surface, 0.03),
    tabBg: hexToRgba(custom.bg, 0.9),
    tabBorder: custom.border,
    tabActive: custom.tabActive,
    tabInactive: hexToRgba(custom.primary, 0.6),
    gradientStart: custom.primary,
    gradientMid: custom.primary,
    gradientEnd: custom.accent,
    shadow: custom.primary,
  };
}

export type ThemeMode = "dark" | "light";

// --- Dark Themes ---

export const hero: ThemeColors = {
  bg: "#000000",
  surface: "#1C1C1E",
  surfaceAlt: "#2C2C2E",
  cardBg: "#1C1C1E",
  cardBgLight: "#2C2C2E",
  glass: "rgba(28, 28, 30, 0.85)",
  text: "#FFFFFF",
  textSecondary: "#AEAEB2",
  textMuted: "#8E8E93",
  primary: "#0A84FF",
  primaryLight: "rgba(10, 132, 255, 0.16)",
  accent: "#5E5CE6",
  success: "#30D158",
  warning: "#FF9F0A",
  danger: "#FF453A",
  info: "#64D2FF",
  border: "rgba(255, 255, 255, 0.12)",
  borderLight: "rgba(255, 255, 255, 0.06)",
  tabBg: "rgba(18, 18, 20, 0.92)",
  tabBorder: "rgba(255, 255, 255, 0.14)",
  tabActive: "#0A84FF",
  tabInactive: "#8E8E93",
  gradientStart: "#0A84FF",
  gradientMid: "#5E5CE6",
  gradientEnd: "#30D158",
  shadow: "#0A84FF",
};

export const aurora: ThemeColors = {
  bg: "#0A0D14",
  surface: "#131A26",
  surfaceAlt: "#1C2433",
  cardBg: "#131A26",
  cardBgLight: "#1C2433",
  glass: "rgba(19, 26, 38, 0.85)",
  text: "#F2F6FB",
  textSecondary: "#A9B4C6",
  textMuted: "#6E7A91",
  primary: "#6B8CFF",
  primaryLight: "rgba(107, 140, 255, 0.16)",
  accent: "#64D2FF",
  success: "#30D158",
  warning: "#FF9F0A",
  danger: "#FF453A",
  info: "#64D2FF",
  border: "rgba(255, 255, 255, 0.12)",
  borderLight: "rgba(255, 255, 255, 0.06)",
  tabBg: "rgba(10, 13, 20, 0.92)",
  tabBorder: "rgba(255, 255, 255, 0.14)",
  tabActive: "#6B8CFF",
  tabInactive: "#6E7A91",
  gradientStart: "#6B8CFF",
  gradientMid: "#0A84FF",
  gradientEnd: "#30D158",
  shadow: "#6B8CFF",
};

export const onyx: ThemeColors = {
  bg: "#0C0A14",
  surface: "#171327",
  surfaceAlt: "#211B38",
  cardBg: "#171327",
  cardBgLight: "#211B38",
  glass: "rgba(23, 19, 39, 0.85)",
  text: "#F5F3FA",
  textSecondary: "#AFA8CB",
  textMuted: "#6F6790",
  primary: "#A78BFA",
  primaryLight: "rgba(167, 139, 250, 0.16)",
  accent: "#C084FC",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#FB7185",
  info: "#67E8F9",
  border: "rgba(255, 255, 255, 0.12)",
  borderLight: "rgba(255, 255, 255, 0.06)",
  tabBg: "rgba(12, 10, 20, 0.92)",
  tabBorder: "rgba(255, 255, 255, 0.14)",
  tabActive: "#A78BFA",
  tabInactive: "#6F6790",
  gradientStart: "#A78BFA",
  gradientMid: "#818CF8",
  gradientEnd: "#C084FC",
  shadow: "#A78BFA",
};

// --- Light Themes ---

export const pearl: ThemeColors = {
  bg: "#F2F2F7",
  surface: "#FFFFFF",
  surfaceAlt: "#E9E9EF",
  cardBg: "#FFFFFF",
  cardBgLight: "#E9E9EF",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#1C1C1E",
  textSecondary: "#6E6E73",
  textMuted: "#84848B",
  primary: "#007AFF",
  primaryLight: "rgba(0, 122, 255, 0.13)",
  accent: "#5856D6",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  info: "#0A84FF",
  border: "rgba(0, 0, 0, 0.10)",
  borderLight: "rgba(0, 0, 0, 0.05)",
  tabBg: "rgba(248, 248, 250, 0.94)",
  tabBorder: "rgba(0, 0, 0, 0.12)",
  tabActive: "#007AFF",
  tabInactive: "#8E8E93",
  gradientStart: "#007AFF",
  gradientMid: "#5856D6",
  gradientEnd: "#AF52DE",
  shadow: "#007AFF",
};

export const mist: ThemeColors = {
  bg: "#EDF2F7",
  surface: "#FFFFFF",
  surfaceAlt: "#E2EAF2",
  cardBg: "#FFFFFF",
  cardBgLight: "#E2EAF2",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#17202B",
  textSecondary: "#4A5A70",
  textMuted: "#77879C",
  primary: "#0D9488",
  primaryLight: "rgba(13, 148, 136, 0.13)",
  accent: "#0E7490",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#0891B2",
  border: "rgba(0, 0, 0, 0.10)",
  borderLight: "rgba(0, 0, 0, 0.05)",
  tabBg: "rgba(237, 242, 247, 0.94)",
  tabBorder: "rgba(0, 0, 0, 0.12)",
  tabActive: "#0D9488",
  tabInactive: "#6D8298",
  gradientStart: "#0D9488",
  gradientMid: "#0E7490",
  gradientEnd: "#1D4ED8",
  shadow: "#0D9488",
};

export const sand: ThemeColors = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F1EBE3",
  cardBg: "#FFFFFF",
  cardBgLight: "#F1EBE3",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#211D19",
  textSecondary: "#665C51",
  textMuted: "#988D80",
  primary: "#B45309",
  primaryLight: "rgba(180, 83, 9, 0.13)",
  accent: "#C2410C",
  success: "#15803D",
  warning: "#CA8A04",
  danger: "#B91C1C",
  info: "#0369A1",
  border: "rgba(0, 0, 0, 0.10)",
  borderLight: "rgba(0, 0, 0, 0.05)",
  tabBg: "rgba(250, 246, 240, 0.94)",
  tabBorder: "rgba(0, 0, 0, 0.12)",
  tabActive: "#B45309",
  tabInactive: "#988D80",
  gradientStart: "#B45309",
  gradientMid: "#C2410C",
  gradientEnd: "#92400E",
  shadow: "#B45309",
};

export const themes: Record<string, ThemeColors> = {
  hero,
  aurora,
  onyx,
  pearl,
  mist,
  sand,
};

export const themeNames: Record<string, string> = {
  hero: "Graphite",
  aurora: "Aurora",
  onyx: "Onyx",
  pearl: "Pearl",
  mist: "Mist",
  sand: "Sand",
};

export const themeModes: Record<string, ThemeMode> = {
  hero: "dark",
  aurora: "dark",
  onyx: "dark",
  pearl: "light",
  mist: "light",
  sand: "light",
};

export const THEME_IDS = Object.keys(themes);
