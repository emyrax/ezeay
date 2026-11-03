import { Platform, useWindowDimensions } from "react-native";
import { NAV } from "../constants/layout";
import {
  getBreakpoint,
  getGutter,
  getGridColumns,
  getThreadsLayout,
} from "../lib/responsive";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);
  const threadsLayout = getThreadsLayout(width);

  return {
    width,
    height,
    breakpoint,
    gutter: getGutter(breakpoint),
    isWeb: Platform.OS === "web",
    isLaptopUp: width >= NAV.sidebarMinWidth,
    isTabletUp: width >= NAV.sidebarTabletMinWidth,
    isWebWide: Platform.OS === "web" && width >= NAV.sidebarMinWidth,
    isDesktop: breakpoint === "desktop",
    threadsLayout,
    showSidebar: threadsLayout.showSidebar,
    sidebarExpanded: threadsLayout.sidebarExpanded,
    isThreePane: threadsLayout.mode === "threePane",
    gridColumns: (minCardWidth: number, gap?: number, max?: number) =>
      getGridColumns(width, minCardWidth, gap, max),
  };
}

export function useTabBarInset(nativeInset: number): number {
  const { showSidebar } = useResponsive();
  return showSidebar ? NAV.desktopContentInset : nativeInset;
}
