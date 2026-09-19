import { Platform } from "react-native";

export const safeFont = Platform.OS === "ios" ? "Arial" : "sans-serif";

// Premium Hero Theme — Blue & Green
export const heroBg = "#0A0A14";
export const heroSurface = "#14142A";
export const heroSurfaceAlt = "#1A1A34";
export const heroGlass = "rgba(20, 20, 42, 0.85)";

export const heroText = "#F1F1F6";
export const heroTextSecondary = "#9D9DB5";
export const heroTextMuted = "#6B6B85";

export const heroBlue = "#4F8CFF";
export const heroGreen = "#00D68F";
export const heroTeal = "#00B4D8";
export const heroCyan = "#00D4FF";
export const heroEmerald = "#34D399";
export const heroOrange = "#FF8A65";
export const heroRed = "#FF5252";

export const heroBorder = "rgba(255, 255, 255, 0.06)";
export const heroBorderLight = "rgba(255, 255, 255, 0.1)";

export const heroTabBg = "rgba(10, 10, 20, 0.9)";
export const heroTabBorder = "rgba(255, 255, 255, 0.08)";
export const heroTabActive = "#4F8CFF";
export const heroTabInactive = "#6B6B85";

export const heroGradientStart = "#4F8CFF";
export const heroGradientMid = "#00B4D8";
export const heroGradientEnd = "#00D68F";

export const heroCardShadow = {
  shadowColor: "#4F8CFF",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 4,
};

export const heroSurfaceBorder = {
  borderTopWidth: 1,
  borderTopColor: "rgba(255, 255, 255, 0.05)",
  borderLeftWidth: 1,
  borderLeftColor: "rgba(255, 255, 255, 0.03)",
  borderRightWidth: 1,
  borderRightColor: "rgba(255, 255, 255, 0.03)",
};

export const heroCardBorder = {
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.05)",
};
