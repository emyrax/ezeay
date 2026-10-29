export const landingColors = {
  bg: "#070A10",
  bgSoft: "#0A101C",
  panel: "#0E1524",
  panelAlt: "#121B2C",
  panelRaised: "#162238",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",
  text: "#F8FAFC",
  textMuted: "#A7B4C7",
  textSubtle: "#64748B",
  blue: "#2F7CFF",
  blueSoft: "#7FB0FF",
  violet: "#7C6CFF",
  green: "#38D996",
  amber: "#FFB84D",
  pink: "#E879C0",
  danger: "#FF5C5C",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(2,5,10,0.72)",
} as const;

export const landingFonts = {
  display: "SpaceGrotesk_700Bold",
  heading: "SpaceGrotesk_600SemiBold",
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodySemiBold: "SpaceGrotesk_600SemiBold",
} as const;

export const landingRadii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const landingShadows = {
  glow: {
    shadowColor: landingColors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 10,
  },
} as const;
