# Theme Reference

## Colors

Defined in `constants/colors.ts`. Import by name.

### Brand & Surface

| Token | Value | Usage |
|-------|-------|-------|
| `primaryColor` | `#27d436` | Accent green — buttons, highlights, active states |
| `secondaryColor` | `#1A1F3A` | Dark navy — text, backgrounds on welcome/login |
| `backgroundColor` | `#F5F5F5` | Light grey — welcome/login screen backgrounds |
| `white` | `#ffffff` | Card surfaces on light screens |

### Dark Theme (tab screens)

| Token | Value | Usage |
|-------|-------|-------|
| `darkBg` | `#12121A` | Main background on Camp, Quests, Stats, Profile |
| `darkSurface` | `#1E1E2E` | Card backgrounds (info cards, action cards) |
| `darkCard` | `#1E1E2E` | Same as darkSurface |
| `darkTabBar` | `#0F0F1A` | Floating tab bar background |
| `darkBorder` | `#2A2A3A` | Dividers, card borders, tab bar border (`#1F293D` inline) |
| `darkTabBorder` | `#1E1E30` | Tab bar border (inline use is `#1F293D`) |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `darkText` | `#FFFFFF` | Primary text on dark surfaces |
| `darkTextSecondary` | `#A0A0B0` | Secondary text on dark (empty states, descriptions) |
| `darkTextMuted` | `#707080` | Muted text on dark (labels, metadata, version) |
| `textSecondary` | `#616161` | Secondary text on light (subtitles, toggles) |
| `textMuted` | `#b3b3c7` | Muted text on light (placeholders, divider text) |

### Accents

| Token | Value |
|-------|-------|
| `accentPurple` | `#A855F7` |
| `accentBlue` | `#00A3FF` |
| `accentOrange` | `#FF9F00` |
| `accentGreen` | `#2ECC71` |
| `accentRed` | `#FF5722` |

### Tab Bar

| Property | Value |
|----------|-------|
| Active tint | `#38BDF8` |
| Inactive tint | `#64748B` |
| Container | `#121826` |
| Border | `#1F293D` |

---

## Typography

### Font Family

```ts
const safeFont = Platform.OS === "ios" ? "Arial" : "sans-serif";
```

Import from `constants/colors.ts`. Used via `fontFamily: safeFont`.

### Font Sizes

| Size | Usage | Frequency |
|------|-------|-----------|
| 11 | Overline labels, trophy details, streak labels, XP units | High (11 components) |
| 12 | Captions, disclaimers, XP labels, button text, section subtitles | Highest (17 components) |
| 14 | Body text, subtitles, email display, toggle text | Common (7 components) |
| 15 | Search text, social buttons, card titles | Low |
| 16 | Primary body text, input text, card values, action text | High (9 components) |
| 18 | Section titles, empty state titles, username, primary buttons | High (10 components) |
| 20 | Primary button text, drag handle text | Low |
| 22 | Brand text (login header), error title | Low |
| 24 | Screen titles (quests, stats), hero values | Moderate |
| 28 | Login screen title, XP/streak hero values | Moderate |
| 32 | Welcome screen title | Low |

### Font Weights

| Weight | Usage |
|--------|-------|
| `"400"` | Inactive tab label |
| `"500"` | Email, time text, action labels |
| `"600"` | Active tab label, info labels, loading text |
| `"700"` | **Default for buttons, section titles, card values** |
| `"800"` | **Headings, hero text, brand text** |
| `"900"` | Screen titles on stats/quests, streak values |

Canonical: `"700"` (body/buttons) and `"800"` (headings).

### Letter Spacing

| Value | Usage |
|-------|-------|
| `0.5` | **Standard** — buttons, section headers, labels (9 components) |
| `1` | Overline (stats screen) |

---

## Border Radius

No single token file; values are inline. Most standardized values:

| Value | Typical Usage | Frequency |
|-------|---------------|-----------|
| 6 | Badges, difficulty/type chips | 4 |
| 8 | Small buttons, start/claim/in-progress labels | 4 |
| 12 | Icon wrappers, search bar | 3 |
| 16 | Cards, primary buttons | 6 |
| 20 | Tab bar container, large icon buttons | 3 |
| 28 | Info cards, large avatars | 2 |
| 32 | Login card, trophy circles | 3 |
| 999 | Pill shapes (drag handle) | 2 |

**Quirk**: 22 unique border radius values across the codebase — not fully standardized.

---

## Spacing

No spacing scale exists. Most recurring values:

### paddingHorizontal

| Value | Usage |
|-------|-------|
| 16 | **Most common** — section containers, input wrappers, scroll views |
| 24 | Welcome screen, login header, content cards |
| 12 | Tab bar container, small labels |
| 8 | Badges, chips, drag container |

### paddingVertical

| Value | Usage |
|-------|-------|
| 6 | Small buttons (start, claim, in-progress) |
| 12 | Search bar |
| 16 | Primary buttons |
| 8 | Tab items |

### marginBottom

| Value | Usage |
|-------|-------|
| 20 | Section titles, headers, rows |
| 16 | Section titles, cards, bar sections |
| 12 | Cards, input groups, content |

### gap

| Value | Usage |
|-------|-------|
| 4 | Button content, timer rows |
| 8 | Top rows, dot containers |
| 10 | Brand wrappers, social buttons |
| 12/14 | Footers, carousels, social rows |

---

## Shadows

Three recurring patterns:

### 1. Primary Button Glow
```js
{
  shadowColor: primaryColor, // "#27d436"
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
}
```

### 2. Surface Card
```js
{
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.15,
  shadowRadius: 20,
  elevation: 3,
}
```

### 3. Tab Bar Float
```js
{
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 4.65,
  elevation: 8,
}
```

---

## Component Tokens

### Floating Tab Bar

```json
{
  "position": "absolute",
  "bottom": 24,
  "left": 16,
  "right": 16,
  "height": 64,
  "backgroundColor": "#121826",
  "borderRadius": 20,
  "borderWidth": 1,
  "borderColor": "#1F293D",
  "paddingHorizontal": 12
}
```

### Cards (info, action)

```json
{
  "backgroundColor": "#1E1E2E",
  "borderRadius": 28,
  "padding": 20
}
```

### Primary Buttons

```json
{
  "backgroundColor": "#27d436",
  "paddingVertical": 16,
  "borderRadius": 16
}
```

### Text Inputs

```json
{
  "backgroundColor": "rgba(26, 31, 58, 0.04)",
  "borderRadius": 14,
  "paddingHorizontal": 16,
  "height": 56,
  "borderWidth": 1,
  "borderColor": "rgba(26, 31, 58, 0.08)"
}
```
