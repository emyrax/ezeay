# Theme Reference

Yuinx ships **two palettes** — a dark theme (`appTheme`) and a premium light
theme (`lightTheme`, "Iris") — plus a runtime appearance picker
(Light / Dark / System).

- Source of truth: `constants/themes.ts` (`appTheme`, `lightTheme`, `themeFor`)
- Access in screens/components: `hooks/useTheme.ts` → `useThemeColors()`
- Resolve the active mode (for status bars, `app.json`, etc.): `useThemeMode()`
- Persisted preference: `store/themeStore.ts` (`mode`, `setMode`)
- User-facing picker: Settings → **Appearance**

```ts
import { useThemeColors } from "../../hooks/useTheme";
const theme = useThemeColors();
```

`useThemeColors()` is **reactive** — components re-render when the user changes
appearance or when the OS scheme changes while the preference is `"system"`.
Default mode is `"dark"` to preserve the original look.

## Use tokens, not `appTheme` directly

Importing `appTheme` (or `lightTheme`) directly at module scope bakes one palette
into a static `StyleSheet` and will NOT adapt when the theme changes. Inside a
component, always resolve colors from the hook and apply them inline:

```ts
const theme = useThemeColors();
<View style={[styles.card, { backgroundColor: theme.surface }]} />
```

Module-level `StyleSheet.create()` should only hold layout/spacing/typography;
colors belong in inline overrides.

## Dark palette (`appTheme`)

| Token | Value |
|-------|-------|
| `bg` | `#152A4D` |
| `surface` | `#1B3560` |
| `surfaceAlt` | `#213E6E` |
| `glass` | `rgba(27, 53, 96, 0.85)` |
| `text` | `#ffffff` |
| `textSecondary` | `#b5cee2` |
| `textMuted` | `#a2aab3` |
| `primary` | `#2d8dfc` |
| `primaryLight` | `rgba(149, 208, 253, 0.16)` |
| `accent` | `#1c9bfc` |
| `success` | `#22C55E` |
| `warning` | `#F59E0B` |
| `danger` | `#EF4444` |
| `info` | `#1596f8` |
| `border` | `#2D4E7F` |
| `borderLight` | `#213A60` |
| `cardBg` / `cardBgLight` | `#1B3560` / `#213E6E` |
| `tabBg` | `rgba(21, 42, 77, 0.92)` |
| `tabBorder` | `#2D4E7F` |
| `tabActive` / `tabInactive` | `#088bf0` / `#5F8FBF` |
| `gradientStart/Mid/End` | `#f8fcff` / `#0487eb` / `#068ff7` |
| `shadow` | `#058ff8` |

## Light palette (`lightTheme` — "Iris")

Premium light theme inspired by the Coach surface. The primary is a confident
indigo-violet (`#6D5BF5`) that clears WCAG AA (≈4.5:1) against both white and
dark text, so it works as an accent fill *and* accent-on-surface text.

| Token | Value |
|-------|-------|
| `bg` | `#F5F6FB` |
| `surface` | `#FFFFFF` |
| `surfaceAlt` | `#EEF1F8` |
| `glass` | `rgba(255, 255, 255, 0.82)` |
| `text` | `#0F172A` |
| `textSecondary` | `#475569` |
| `textMuted` | `#64748B` |
| `primary` | `#6D5BF5` |
| `primaryLight` | `rgba(109, 91, 245, 0.12)` |
| `accent` | `#8B7EF8` |
| `success` | `#16A34A` |
| `warning` | `#D97706` |
| `danger` | `#DC2626` |
| `info` | `#4F46E5` |
| `border` | `#E4E7F0` |
| `borderLight` | `#EEF1F7` |
| `cardBg` / `cardBgLight` | `#FFFFFF` / `#F5F6FB` |
| `tabBg` | `rgba(255, 255, 255, 0.92)` |
| `tabBorder` | `#E4E7F0` |
| `tabActive` / `tabInactive` | `#6D5BF5` / `#64748B` |
| `gradientStart/Mid/End` | `#A78BFA` / `#7C6CF8` / `#6D5BF5` |
| `shadow` | `#6D5BF5` |

Hex tokens concatenated with alpha suffixes in code (for example
`theme.primary + "16"`) must remain 6-digit hex values — all tokens above are.

## Usage rules

- Use `theme.bg` for screen roots and `theme.surface` / `theme.surfaceAlt` for cards.
- Use `theme.text` for primary copy, `theme.textSecondary` for supporting copy, `theme.textMuted` for metadata.
- Use `theme.primary` / `theme.accent` for interactive accents. Text placed on a `theme.primary` fill should use `theme.bg` for contrast.
- Prefer semantic tokens over hardcoded hex so both modes stay correct. Audit any new hardcoded color against light mode.

## Tab bar

Use `theme.tabBg`, `theme.tabActive`, `theme.tabInactive`, and `theme.tabBorder`. Layout is unchanged: `position: absolute`, `bottom: 24`, `left/right: 16`, `height: 64`, `borderRadius: 20`, `elevation: 8`.

## Coach + lesson theater

- The Coach surface (`component/coach/*`) keeps its own light-on-dark brand
  identity via `constants/coachTheme.ts` and is independent of the app theme.
- `lessonTheaterTheme` (`constants/lessonTheater.ts`) intentionally stays dark —
  a theater should always be dark for video.

## Intentionally dark surfaces

- `component/LoadingScreen.tsx` full-screen splash stays dark (mascot art is
  authored on a dark background).
- `component/SpinWheel.tsx` overlay stays dark.

## Loading screen

`component/LoadingScreen.tsx` renders the centralized `images.loadingMascot` GIF on a full-bleed `#041022` background. The GIF is pre-processed with a dark background so it blends seamlessly.
