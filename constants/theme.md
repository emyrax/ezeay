# Theme Reference

The theme system lives in `constants/themes.ts`. Every screen and reusable component reads colors through `hooks/useTheme.ts` (`useThemeColors()`), which returns the active `ThemeColors` from `store/themeStore.ts` — either a preset or a user-created custom theme.

- **Presets**: 6 Apple-style themes — 3 dark + 3 light.
- **Mode philosophy**: dark presets use light text on dark surfaces; light presets use dark text on light surfaces (reverse contrast). This is the opposite of the old `colors.ts` era and is intentional.
- **Selection UI**: Settings → Appearance shows the presets grouped into **Dark** and **Light**, plus a **Custom** tile that opens the in-app theme editor.
- **Fallback**: any persisted id that no longer exists resolves to `themes.hero` (`hooks/useTheme.ts:13`).

```ts
import { useThemeColors } from "../../hooks/useTheme";
const theme = useThemeColors();
```

## ThemeColors tokens (`constants/themes.ts`)

All tokens are present on every preset and on themes derived from custom colors.

| Token | Meaning |
|-------|---------|
| `bg` | App background |
| `surface` | Card / list background |
| `surfaceAlt` | Slightly elevated surface (insets, pressed states) |
| `glass` | Semi-transparent surface (sheets, headers) |
| `text` | Primary text |
| `textSecondary` | Secondary text |
| `textMuted` | Captions, metadata, placeholders |
| `primary` | Primary accent (buttons, links, active states) |
| `primaryLight` | Tinted `primary` wash (selected rows, chip backgrounds) |
| `accent` | Secondary accent (badges, secondary highlights) |
| `success` / `warning` / `danger` / `info` | Semantic status colors |
| `border` | Dividers, card borders |
| `borderLight` | Subtler hairline borders |
| `cardBg` / `cardBgLight` | Card backgrounds (legacy aliases of surface / surfaceAlt) |
| `tabBg` / `tabBorder` | Floating tab bar background / border |
| `tabActive` / `tabInactive` | Tab bar tint colors |
| `gradientStart` / `gradientMid` / `gradientEnd` | Linear gradients (headers, buttons) |
| `shadow` | Colored shadow / glow color |

## Presets

| id | Name | Mode | `bg` | `surface` | `text` | `primary` | `accent` |
|----|------|------|------|-----------|--------|-----------|----------|
| `hero` | Graphite | dark | `#000000` | `#1C1C1E` | `#FFFFFF` | `#0A84FF` | `#5E5CE6` |
| `aurora` | Aurora | dark | `#0A0D14` | `#131A26` | `#F2F6FB` | `#6B8CFF` | `#64D2FF` |
| `onyx` | Onyx | dark | `#0C0A14` | `#171327` | `#F5F3FA` | `#A78BFA` | `#C084FC` |
| `pearl` | Pearl | light | `#F2F2F7` | `#FFFFFF` | `#1C1C1E` | `#007AFF` | `#5856D6` |
| `mist` | Mist | light | `#EDF2F7` | `#FFFFFF` | `#17202B` | `#0D9488` | `#0E7490` |
| `sand` | Sand | light | `#FAF6F0` | `#FFFFFF` | `#211D19` | `#B45309` | `#C2410C` |

`themeNames` maps id → display name; `themeModes` maps id → `"dark" | "light"` (used by the Settings picker to group presets); `THEME_IDS = Object.keys(themes)`.

## Custom themes

Users can create a theme in Settings → Appearance → Custom. Persisted as `CustomThemeColors` (8 fields: `bg`, `surface`, `text`, `textSecondary`, `primary`, `accent`, `border`, `tabActive`) and expanded into a full `ThemeColors` by `deriveTheme()`. Derived values: `surfaceAlt` / `cardBgLight` darken `surface`; `glass` = surface @ 85%; `textMuted` = 60% of `textSecondary`; `borderLight` = 50% of `border`; `tabBg` = 90% of `bg`; `success/warning/danger/info` are fixed.

## Contrast rules (enforced)

| Token | Dark (`text` on dark surfaces) | Light (`text` on light surfaces) |
|-------|-------------------------------|----------------------------------|
| `text` | ≥ 4.5:1 | ≥ 4.5:1 |
| `textSecondary` | ≥ 4.5:1 | ≥ 3:1 |
| `textMuted` | ≥ 3:1 | ≥ 3:1 |
| `primary` / `accent` | ≥ 3:1 (+ ≥ 4.5:1 for small text) | ≥ 3:1 (+ ≥ 4.5:1 for small text) |

Semantic colors (`success`/`warning`/`danger`/`info`) use platform-idiomatic values (e.g. `#34C759`, `#FF9500`) and may fall below 3:1 as solid fills on white — verify pairings per use. If a custom theme fails these targets, prefer tweaks in the editor over code changes.

## Tab bar

Use theme tokens, not hardcoded `#38BDF8` / `#64748B`:

| Token | Dark example (hero) | Light example (pearl) |
|-------|---------------------|-----------------------|
| `tabBg` | `rgba(18, 18, 20, 0.92)` | `rgba(248, 248, 250, 0.94)` |
| `tabActive` | `#0A84FF` | `#007AFF` |
| `tabInactive` | `#8E8E93` | `#8E8E93` |
| `tabBorder` | `rgba(255, 255, 255, 0.14)` | `rgba(0, 0, 0, 0.12)` |

Layout (unchanged): `position: absolute`, `bottom: 24`, `left/right: 16`, `height: 64`, `borderRadius: 20`, `elevation: 8`.

## Hardcoded accents (kept intentionally)

Decorative accents below are hardcoded rather than theme-driven (documented decision). They are `accent`-adjacent cyan/secondary tones used for illustration, charts, and confetti:

- `#38BDF8` / `#64748B` — StudyUploadSheet, Stats, DropdownSelect, Pill, Timetable, RichTextEditor headings, confetti, spinOutcomes, `ColorPalette` defaults.

If a new feature needs an accent, prefer `theme.primary` / `theme.accent` / `theme.info`.

## Migration notes

- Removed ids: `midnight`, `forest`, `sunset`, `ocean`, `dawn`, `coral`, `sky`, `linen`, `bloom`, `matcha`. Any persisted selection resolves to `hero`.
- The old `constants/colors.ts` tokens (`primaryColor #27d436`, `secondaryColor #1A1F3A`, `bgColor #F5F5F5`, dark surface set) are legacy; `darkTabSurface` / `darkCard` equivalents are now `theme.tabBg` / `theme.surface`.
- Static screens (welcome, auth/onboarding, login) keep a fixed dark hero-branded look via direct imports of `hero` in `constants/themes.ts`; tab/feature screens are fully theme-aware.