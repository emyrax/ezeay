export const BREAKPOINTS = {
  tablet: 640,
  laptop: 1024,
  desktop: 1440,
} as const;

export type Breakpoint = "phone" | "tablet" | "laptop" | "desktop";

export const CONTENT_WIDTHS = {
  reading: 760,
  standard: 960,
  wide: 1200,
  full: 0,
} as const;

export type ContentWidth = keyof typeof CONTENT_WIDTHS;

export const GUTTERS: Record<Breakpoint, number> = {
  phone: 16,
  tablet: 24,
  laptop: 32,
  desktop: 32,
};

export const NAV = {
  sidebarWidth: 96,
  sidebarMinWidth: 1024,
  tabBarHeight: 74,
  tabBarMaxWidth: 560,
  tabBarSideInset: 16,
  tabBarBottomInset: 24,
  desktopContentInset: 24,
} as const;

export const TOAST_MAX_WIDTH = 420;
