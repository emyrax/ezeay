import {
  BREAKPOINTS,
  CONTENT_WIDTHS,
  GUTTERS,
  type Breakpoint,
  type ContentWidth,
} from "../constants/layout";

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
