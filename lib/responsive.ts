import {
  BREAKPOINTS,
  CONTENT_WIDTHS,
  EXPLORE,
  GUTTERS,
  type Breakpoint,
  type ContentWidth,
} from "../constants/layout";

export interface ExploreLayout {
  showPanel: boolean;
  stageMaxWidth: number;
  panelWidth: number;
  gap: number;
  contentMaxWidth: number;
}

export function getExploreLayout(breakpoint: Breakpoint): ExploreLayout {
  switch (breakpoint) {
    case "desktop":
      return {
        showPanel: true,
        stageMaxWidth: EXPLORE.stageMaxWidth,
        panelWidth: EXPLORE.panelWidthDesktop,
        gap: EXPLORE.gapDesktop,
        contentMaxWidth: EXPLORE.contentMaxWidth,
      };
    case "laptop":
      return {
        showPanel: true,
        stageMaxWidth: EXPLORE.stageMaxWidthLaptop,
        panelWidth: EXPLORE.panelWidth,
        gap: EXPLORE.gap,
        contentMaxWidth: CONTENT_WIDTHS.standard,
      };
    case "tablet":
      return {
        showPanel: false,
        stageMaxWidth: EXPLORE.stageMaxWidth,
        panelWidth: 0,
        gap: 0,
        contentMaxWidth: CONTENT_WIDTHS.standard,
      };
    default:
      return {
        showPanel: false,
        stageMaxWidth: 0,
        panelWidth: 0,
        gap: 0,
        contentMaxWidth: 0,
      };
  }
}

export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.laptop) return "laptop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
}

export function getContentWidth(kind: ContentWidth): number | undefined {
  const width = CONTENT_WIDTHS[kind];
  return width > 0 ? width : undefined;
}

export function getGutter(breakpoint: Breakpoint): number {
  return GUTTERS[breakpoint];
}

export function getGridColumns(
  containerWidth: number,
  minCardWidth: number,
  gap = 12,
  max = 4,
): number {
  if (containerWidth <= 0 || minCardWidth <= 0) return 1;
  const columns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
  return Math.min(max, Math.max(1, columns));
}

export function getCarouselTranslate(index: number, panelWidth: number): number {
  return -Math.max(0, index) * Math.max(0, panelWidth);
}
