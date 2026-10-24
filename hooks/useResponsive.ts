import { Platform, useWindowDimensions } from "react-native";
import { NAV } from "../constants/layout";
import {
  getBreakpoint,
  getGutter,
  getGridColumns,
} from "../lib/responsive";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);

  return {
    width,
    height,
    breakpoint,
    gutter: getGutter(breakpoint),
    isWeb: Platform.OS === "web",
    isLaptopUp: width >= NAV.sidebarMinWidth,
    isWebWide: Platform.OS === "web" && width >= NAV.sidebarMinWidth,
    isDesktop: breakpoint === "desktop",
    gridColumns: (minCardWidth: number, gap?: number, max?: number) =>
      getGridColumns(width, minCardWidth, gap, max),
  };
}

export function useTabBarInset(nativeInset: number): number {
  const { isWebWide } = useResponsive();
  return isWebWide ? NAV.desktopContentInset : nativeInset;
}
