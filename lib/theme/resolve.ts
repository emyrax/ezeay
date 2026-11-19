export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "light" | "dark";
/** Mirrors React Native's `ColorSchemeName`, including "unspecified". */
export type SystemScheme = "light" | "dark" | "unspecified" | null | undefined;

/**
 * Resolve the concrete theme name from the stored preference.
 *
 * - "system" follows the OS scheme, defaulting to dark when unknown.
 * - Anything else resolves to itself (only "light" gets light).
 */
export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: SystemScheme,
): ResolvedTheme {
  if (mode === "system") {
    return systemScheme === "light" ? "light" : "dark";
  }
  return mode === "light" ? "light" : "dark";
}
