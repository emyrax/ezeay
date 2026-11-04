# Theme Reference

Yuinx uses one fixed dark palette. There is no runtime theme switching, no theme store, and no appearance picker.

- Source of truth: `constants/themes.ts`
- Access in screens/components: `hooks/useTheme.ts` → `useThemeColors()`
- Fallback behavior: none — `useThemeColors()` always returns `appTheme`

```ts
import { useThemeColors } from "../../hooks/useTheme";
const theme = useThemeColors();
```

## Fixed palette (`appTheme`)

| Token | Value |
|-------|-------|
| `bg` | `#152A4D` |
| `surface` | `#1B3560` |
| `surfaceAlt` | `#213E6E` |
| `glass` | `rgba(27, 53, 96, 0.85)` |
| `text` | `#95D0FD` |
| `textSecondary` | `#7FB9E8` |
| `textMuted` | `#5F8FBF` |
| `primary` | `#95D0FD` |
| `primaryLight` | `rgba(149, 208, 253, 0.16)` |
| `accent` | `#95D0FD` |
| `success` | `#22C55E` |
| `warning` | `#F59E0B` |
| `danger` | `#EF4444` |
| `info` | `#95D0FD` |
| `border` | `#2D4E7F` |
| `borderLight` | `#213A60` |
| `cardBg` / `cardBgLight` | `#1B3560` / `#213E6E` |
| `tabBg` | `rgba(21, 42, 77, 0.92)` |
| `tabBorder` | `#2D4E7F` |
| `tabActive` / `tabInactive` | `#95D0FD` / `#5F8FBF` |
| `gradientStart/Mid/End` | `#95D0FD` |
| `shadow` | `#95D0FD` |

`primary`, `accent`, `danger`, and other colors concatenated with alpha suffixes in code (for example `theme.primary + "16"`) must remain 6-digit hex values.

## Usage rules

- Use `theme.bg` for screen roots and `theme.surface` / `theme.surfaceAlt` for cards.
- Use `theme.text` for primary copy, `theme.textSecondary` for supporting copy, `theme.textMuted` for metadata.
- Use `theme.primary` / `theme.accent` for interactive accents. Text placed on a `theme.primary` fill should use `theme.bg` for contrast, not white.
- Do not add new theme presets, theme stores, or appearance toggles.

## Tab bar

Use `theme.tabBg`, `theme.tabActive`, `theme.tabInactive`, and `theme.tabBorder`. Layout is unchanged: `position: absolute`, `bottom: 24`, `left/right: 16`, `height: 64`, `borderRadius: 20`, `elevation: 8`.

## Hardcoded accents (kept intentionally)

Decorative illustration/chart/confetti accents such as `#38BDF8` / `#64748B` remain hardcoded in a few components. New accents should prefer `theme.primary`, `theme.accent`, or `theme.info`.

## Loading screen

`component/LoadingScreen.tsx` renders the centralized `images.loadingMascot` GIF on a full-bleed `#152A4D` background. The GIF is pre-processed with a `#152A4D` background so it blends seamlessly.
