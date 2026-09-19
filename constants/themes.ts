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

export const hero: ThemeColors = {
  bg: "#0A0A14",
  surface: "#14142A",
  surfaceAlt: "#1A1A34",
  cardBg: "#14142A",
  cardBgLight: "#1A1A34",
  glass: "rgba(20, 20, 42, 0.85)",
  text: "#F1F1F6",
  textSecondary: "#9D9DB5",
  textMuted: "#6B6B85",
  primary: "#4F8CFF",
  primaryLight: "rgba(79, 140, 255, 0.14)",
  accent: "#00B4D8",
  success: "#00D68F",
  warning: "#FF8A65",
  danger: "#FF5252",
  info: "#00D4FF",
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.03)",
  tabBg: "rgba(10, 10, 20, 0.9)",
  tabBorder: "rgba(255, 255, 255, 0.08)",
  tabActive: "#4F8CFF",
  tabInactive: "#6B6B85",
  gradientStart: "#4F8CFF",
  gradientMid: "#00B4D8",
  gradientEnd: "#00D68F",
  shadow: "#4F8CFF",
};

export const midnight: ThemeColors = {
  bg: "#0D0D1A",
  surface: "#1A1A2E",
  surfaceAlt: "#222240",
  cardBg: "#1A1A2E",
  cardBgLight: "#222240",
  glass: "rgba(26, 26, 46, 0.85)",
  text: "#EEEEFF",
  textSecondary: "#9D9DBF",
  textMuted: "#6B6B8A",
  primary: "#A855F7",
  primaryLight: "rgba(168, 85, 247, 0.14)",
  accent: "#7C3AED",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#818CF8",
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.03)",
  tabBg: "rgba(13, 13, 26, 0.9)",
  tabBorder: "rgba(255, 255, 255, 0.08)",
  tabActive: "#A855F7",
  tabInactive: "#6B6B8A",
  gradientStart: "#A855F7",
  gradientMid: "#7C3AED",
  gradientEnd: "#6D28D9",
  shadow: "#A855F7",
};

export const forest: ThemeColors = {
  bg: "#0A140A",
  surface: "#142114",
  surfaceAlt: "#1A2E1A",
  cardBg: "#142114",
  cardBgLight: "#1A2E1A",
  glass: "rgba(20, 33, 20, 0.85)",
  text: "#E8F0E8",
  textSecondary: "#9DB89D",
  textMuted: "#6B856B",
  primary: "#22C55E",
  primaryLight: "rgba(34, 197, 94, 0.14)",
  accent: "#16A34A",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#2DD4BF",
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.03)",
  tabBg: "rgba(10, 20, 10, 0.9)",
  tabBorder: "rgba(255, 255, 255, 0.08)",
  tabActive: "#22C55E",
  tabInactive: "#6B856B",
  gradientStart: "#22C55E",
  gradientMid: "#16A34A",
  gradientEnd: "#15803D",
  shadow: "#22C55E",
};

export const sunset: ThemeColors = {
  bg: "#140A08",
  surface: "#2E1A14",
  surfaceAlt: "#40221A",
  cardBg: "#2E1A14",
  cardBgLight: "#40221A",
  glass: "rgba(46, 26, 20, 0.85)",
  text: "#FFF0E8",
  textSecondary: "#D4A898",
  textMuted: "#A07868",
  primary: "#FF8A65",
  primaryLight: "rgba(255, 138, 101, 0.14)",
  accent: "#FF5722",
  success: "#66BB6A",
  warning: "#FFB300",
  danger: "#EF5350",
  info: "#FFAB91",
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.03)",
  tabBg: "rgba(20, 10, 8, 0.9)",
  tabBorder: "rgba(255, 255, 255, 0.08)",
  tabActive: "#FF8A65",
  tabInactive: "#A07868",
  gradientStart: "#FF8A65",
  gradientMid: "#FF5722",
  gradientEnd: "#FF7043",
  shadow: "#FF8A65",
};

export const ocean: ThemeColors = {
  bg: "#080E14",
  surface: "#0F1A24",
  surfaceAlt: "#162634",
  cardBg: "#0F1A24",
  cardBgLight: "#162634",
  glass: "rgba(15, 26, 36, 0.85)",
  text: "#E0F0FF",
  textSecondary: "#90B4D4",
  textMuted: "#6080A0",
  primary: "#00A3FF",
  primaryLight: "rgba(0, 163, 255, 0.14)",
  accent: "#00D4AA",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#38BDF8",
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.03)",
  tabBg: "rgba(8, 14, 20, 0.9)",
  tabBorder: "rgba(255, 255, 255, 0.08)",
  tabActive: "#00A3FF",
  tabInactive: "#6080A0",
  gradientStart: "#00A3FF",
  gradientMid: "#00D4AA",
  gradientEnd: "#00B4D8",
  shadow: "#00A3FF",
};

// --- Light Themes ---

export const dawn: ThemeColors = {
  bg: "#F8F6F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EDE4",
  cardBg: "#FFFFFF",
  cardBgLight: "#F0EDE4",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#2D2D2D",
  textSecondary: "#6B645C",
  textMuted: "#9D948C",
  primary: "#E07A5F",
  primaryLight: "rgba(224, 122, 95, 0.14)",
  accent: "#3D405B",
  success: "#81B29A",
  warning: "#F2CC8F",
  danger: "#E07A5F",
  info: "#81B29A",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(248, 246, 240, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#E07A5F",
  tabInactive: "#9D948C",
  gradientStart: "#E07A5F",
  gradientMid: "#3D405B",
  gradientEnd: "#81B29A",
  shadow: "#E07A5F",
};

export const coral: ThemeColors = {
  bg: "#FFF5F5",
  surface: "#FFFFFF",
  surfaceAlt: "#FFE8E8",
  cardBg: "#FFFFFF",
  cardBgLight: "#FFE8E8",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#2C3E50",
  textSecondary: "#7F8C9B",
  textMuted: "#A0ABB8",
  primary: "#FF6B6B",
  primaryLight: "rgba(255, 107, 107, 0.14)",
  accent: "#4ECDC4",
  success: "#95E1D3",
  warning: "#FFEAA7",
  danger: "#FF6B6B",
  info: "#4ECDC4",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(255, 245, 245, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#FF6B6B",
  tabInactive: "#A0ABB8",
  gradientStart: "#FF6B6B",
  gradientMid: "#4ECDC4",
  gradientEnd: "#95E1D3",
  shadow: "#FF6B6B",
};

export const sky: ThemeColors = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  surfaceAlt: "#E2E8F0",
  cardBg: "#FFFFFF",
  cardBgLight: "#E2E8F0",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  primary: "#2563EB",
  primaryLight: "rgba(37, 99, 235, 0.14)",
  accent: "#7C3AED",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(240, 244, 248, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#2563EB",
  tabInactive: "#94A3B8",
  gradientStart: "#2563EB",
  gradientMid: "#7C3AED",
  gradientEnd: "#06B6D4",
  shadow: "#2563EB",
};

export const linen: ThemeColors = {
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EBE2",
  cardBg: "#FFFFFF",
  cardBgLight: "#F0EBE2",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#1C1917",
  textSecondary: "#6B6258",
  textMuted: "#A0988C",
  primary: "#8B5CF6",
  primaryLight: "rgba(139, 92, 246, 0.14)",
  accent: "#F59E0B",
  success: "#22C55E",
  warning: "#FBBF24",
  danger: "#EF4444",
  info: "#8B5CF6",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(250, 247, 242, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#8B5CF6",
  tabInactive: "#A0988C",
  gradientStart: "#8B5CF6",
  gradientMid: "#F59E0B",
  gradientEnd: "#22C55E",
  shadow: "#8B5CF6",
};

export const bloom: ThemeColors = {
  bg: "#FDF2F8",
  surface: "#FFFFFF",
  surfaceAlt: "#FCE4EC",
  cardBg: "#FFFFFF",
  cardBgLight: "#FCE4EC",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#374151",
  textSecondary: "#8B7280",
  textMuted: "#B0A0AC",
  primary: "#EC4899",
  primaryLight: "rgba(236, 72, 153, 0.14)",
  accent: "#06B6D4",
  success: "#A7F3D0",
  warning: "#FDE68A",
  danger: "#F472B6",
  info: "#06B6D4",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(253, 242, 248, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#EC4899",
  tabInactive: "#B0A0AC",
  gradientStart: "#EC4899",
  gradientMid: "#06B6D4",
  gradientEnd: "#A7F3D0",
  shadow: "#EC4899",
};

export const matcha: ThemeColors = {
  bg: "#F0FDF4",
  surface: "#FFFFFF",
  surfaceAlt: "#DCFCE7",
  cardBg: "#FFFFFF",
  cardBgLight: "#DCFCE7",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#166534",
  textSecondary: "#4A7C5C",
  textMuted: "#7AA88C",
  primary: "#16A34A",
  primaryLight: "rgba(22, 163, 74, 0.14)",
  accent: "#0EA5E9",
  success: "#86EFAC",
  warning: "#FDE68A",
  danger: "#EF4444",
  info: "#0EA5E9",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(240, 253, 244, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#16A34A",
  tabInactive: "#7AA88C",
  gradientStart: "#16A34A",
  gradientMid: "#0EA5E9",
  gradientEnd: "#86EFAC",
  shadow: "#16A34A",
};

export const pearl: ThemeColors = {
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#E8E8ED",
  cardBg: "#FFFFFF",
  cardBgLight: "#E8E8ED",
  glass: "rgba(255, 255, 255, 0.85)",
  text: "#1D1D1F",
  textSecondary: "#6E6E73",
  textMuted: "#A1A1A6",
  primary: "#007AFF",
  primaryLight: "rgba(0, 122, 255, 0.14)",
  accent: "#FF9500",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  info: "#007AFF",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  tabBg: "rgba(245, 245, 247, 0.95)",
  tabBorder: "rgba(0, 0, 0, 0.10)",
  tabActive: "#007AFF",
  tabInactive: "#A1A1A6",
  gradientStart: "#007AFF",
  gradientMid: "#FF9500",
  gradientEnd: "#34C759",
  shadow: "#007AFF",
};

export const themes: Record<string, ThemeColors> = {
  hero,
  midnight,
  forest,
  sunset,
  ocean,
  dawn,
  coral,
  sky,
  linen,
  bloom,
  matcha,
  pearl,
};

export const themeNames: Record<string, string> = {
  hero: "Hero",
  midnight: "Midnight",
  forest: "Forest",
  sunset: "Sunset",
  ocean: "Ocean",
  dawn: "Dawn",
  coral: "Coral",
  sky: "Sky",
  linen: "Linen",
  bloom: "Bloom",
  matcha: "Matcha",
  pearl: "Pearl",
};

export const THEME_IDS = Object.keys(themes);
