import { NAV, THREADS } from "../constants/layout";

export interface StatsLayout {
  mode: "feed" | "left" | "leftRight" | "ultra";
  showLeftRail: boolean;
  showRightRail: boolean;
  leftRailWidth: number;
  rightRailWidth: number;
  feedMaxWidth: number;
  gap: number;
  bordered: boolean;
}

export function getStatsContentWidth(windowWidth: number): number {
  if (windowWidth >= THREADS.threePaneMinWidth) {
    return Math.max(0, windowWidth - NAV.sidebarExpandedWidth);
  }
  if (windowWidth >= NAV.sidebarTabletMinWidth) {
    return Math.max(0, windowWidth - NAV.sidebarWidth);
  }
  return Math.max(0, windowWidth);
}

export interface ExploreHubLayout {
  showAnalytics: boolean;
  analyticsWidth: number;
  feedMaxWidth: number;
  gap: number;
}

export function getExploreHubLayout(windowWidth: number): ExploreHubLayout {
  const contentWidth = getStatsContentWidth(windowWidth);

  if (windowWidth >= 1720) {
    return {
      showAnalytics: true,
      analyticsWidth: 280,
      feedMaxWidth: Math.min(880, contentWidth - 280 - 24 - 48),
      gap: 24,
    };
  }

  if (windowWidth >= 1480) {
    return {
      showAnalytics: true,
      analyticsWidth: 260,
      feedMaxWidth: Math.min(820, contentWidth - 260 - 20 - 48),
      gap: 20,
    };
  }

  if (windowWidth >= 1280) {
    return {
      showAnalytics: true,
      analyticsWidth: 240,
      feedMaxWidth: Math.min(740, contentWidth - 240 - 20 - 48),
      gap: 20,
    };
  }

  if (windowWidth >= 1024) {
    return {
      showAnalytics: true,
      analyticsWidth: 220,
      feedMaxWidth: Math.min(660, contentWidth - 220 - 20 - 48),
      gap: 20,
    };
  }

  return {
    showAnalytics: false,
    analyticsWidth: 0,
    feedMaxWidth: 680,
    gap: 0,
  };
}

export function getStatsLayout(windowWidth: number): StatsLayout {
  const contentWidth = getStatsContentWidth(windowWidth);

  if (windowWidth >= 1720) {
    return {
      mode: "ultra",
      showLeftRail: true,
      showRightRail: true,
      leftRailWidth: 272,
      rightRailWidth: 320,
      feedMaxWidth: 660,
      gap: 24,
      bordered: true,
    };
  }

  if (windowWidth >= 1480) {
    return {
      mode: "leftRight",
      showLeftRail: true,
      showRightRail: true,
      leftRailWidth: 220,
      rightRailWidth: 280,
      feedMaxWidth: Math.max(520, Math.min(600, contentWidth - 588)),
      gap: 20,
      bordered: true,
    };
  }

  if (windowWidth >= 1280) {
    return {
      mode: "left",
      showLeftRail: true,
      showRightRail: false,
      leftRailWidth: 260,
      rightRailWidth: 0,
      feedMaxWidth: Math.max(520, Math.min(660, contentWidth - 328)),
      gap: 20,
      bordered: true,
    };
  }

  if (windowWidth >= 1024) {
    return {
      mode: "left",
      showLeftRail: true,
      showRightRail: false,
      leftRailWidth: 240,
      rightRailWidth: 0,
      feedMaxWidth: Math.max(480, Math.min(600, contentWidth - 308)),
      gap: 20,
      bordered: true,
    };
  }

  return {
    mode: "feed",
    showLeftRail: false,
    showRightRail: false,
    leftRailWidth: 0,
    rightRailWidth: 0,
    feedMaxWidth: 680,
    gap: 0,
    bordered: windowWidth >= 768,
  };
}
