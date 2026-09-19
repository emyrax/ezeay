# Thumbnail Guide — Game-Style Thumbnail Prompt Reference

Use this guide when generating thumbnail prompts for AI courses via
Nano Banana (Gemini 3.1 Flash Image). The goal is a vibrant,
game-style thumbnail that looks like a fantasy RPG game card.

## Style Guidelines

### 1. Visual Aesthetic
- "Fantasy RPG card art style"
- "Bold, saturated colors on dark backgrounds"
- "Dramatic lighting with rim lights and glow effects"
- "Sharp contrast between subject and background"
- "Pixel-perfect vector-like sharpness"

### 2. Composition
- "Centered heroic subject or symbol"
- "Subject floating or in an action pose"
- "Depth layers: background -> glow -> subject -> foreground particles"
- "Rule of thirds for text placement"
- "Negative space at bottom for course title overlay"

### 3. Color Palette
- Primary subject: bright neon accent (cyan, magenta, gold, emerald)
- Background: dark gradient (#0f0f1a to #1a1a2e)
- Glow effects: match subject color at 40-60% opacity
- Accent particles: complementary colors at high saturation
- Text area: semi-transparent dark overlay (#0a0a12 at 70%)

### 4. Required Elements
- "Glowing animated-style border, 2-3px width"
- "Radial or lens flare behind the subject"
- "Floating particles or sparkles (small circles/stars)"
- "Course category icon in top-left corner"
- "Difficulty badge in top-right corner"
- "Bold outlined title text at the bottom"

### 5. Text Overlay
- Font: "Bold, blocky game font"
- Title: "White with dark text shadow (offset 2px, blur 4px)"
- Category icon: "Simple icon, gold/cyan color, semi-transparent circle behind"
- Difficulty badge: "Green (Beginner) / Orange (Intermediate) / Red (Advanced)"

### 6. Resolution & Format
- "16:9 aspect ratio, 1280x720 resolution"
- "High contrast, suitable for small card previews (260x150px)"
- "No fine details that blur at small sizes"
- "Flat vector style preferred over realistic rendering"

## Example Prompt Template

```
A fantasy RPG game-style course thumbnail for "{courseTitle}".
Style: vibrant game card art, bold neon colors on dark background.
Subject: a heroic {category_icon} floating in center with dramatic
  rim lighting and cyan/gold glow effects.
Background: dark gradient (#0f0f1a to #1a1a2e) with radial lens flare.
Border: glowing 2px border in {accent_color}.
Particles: floating sparkles and light orbs around the subject.
Badges: "{category_name}" icon top-left, "{difficulty}" badge top-right.
Text area: dark overlay at bottom with bold white title text
  "{courseTitle}" with strong black text shadow.
Aspect ratio: 16:9, 1280x720. Style: flat vector, sharp, game UI quality.
```

## Category Icon Mapping

| Category     | Icon / Subject        | Accent Color |
|--------------|-----------------------|--------------|
| programming  | Code brackets / brain | Cyan (#00E5FF) |
| marketing    | Megaphone / chart     | Gold (#FFD700) |
| data-science | Bar chart / database  | Violet (#B388FF) |
| design       | Palette / pen tool    | Pink (#FF4081) |
| business     | Briefcase / graph     | Emerald (#00E676) |
| personal-dev | Star / upward arrow   | Amber (#FFD740) |

## Difficulty Badge Colors

| Difficulty   | Badge Color   |
|--------------|---------------|
| Beginner     | Green (#4CAF50) |
| Intermediate | Orange (#FF9800) |
| Advanced     | Red (#F44336)   |
