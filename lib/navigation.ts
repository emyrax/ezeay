/**
 * Routes whose screen renders without the floating bottom tab bar.
 * Keep this list path-based so adding a route later is a one-line change.
 */
export const HIDDEN_TAB_ROUTES = [
  "(tabs)/coach/idle",
  "(tabs)/coach/chat",
] as const;

function getRoutePath(segments: readonly string[]): string {
  return segments.filter(Boolean).join("/");
}

export function isTabBarHidden(segments: readonly string[]): boolean {
  const path = getRoutePath(segments);
  return HIDDEN_TAB_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export function isCoachRoute(segments: readonly string[]): boolean {
  return segments[0] === "(tabs)" && segments[1] === "coach";
}
