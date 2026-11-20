## ezeay — Expo React Native app
## alway using best pratice and  expo reactnative skills 
## alway implement error handling and testing 
## Quick start

```bash
npm install
npx expo start          # dev server
npx expo run:android    # bare build on device
npx expo run:ios
npm run lint            # expo lint (ESLint via eslint-config-expo)
```

install test framework is configured if no test commands exist.

Yuinx. What your app is called.

an AI-powered adaptive learning platform that builds personalized learning paths around your curiosity.

- Personalized dashboard with realms and bounties
- Gamified quests and achievements (trophies, streaks)
- Performance metrics tracking
- Profile management with avatar upload

RealmsSection, StreakCarousel, ProfileStatsCard

profile (UserProfile in userStore), auth (user/loading/loadedOnce in AuthContext)
Everything else can stay as is and works for any mobile app built on the
recommended stack.
You are an expert React Native and Expo engineer helping me build
Yuinx.
Write clean, simple, maintainable code. Prioritize clarity over
unnecessary abstraction.
Think like a senior mobile developer.

---

## Project Overview

We are building Yuinx, an AI-powered adaptive learning platform that builds personalized learning paths around your curiosity.
The app includes:
- Personalized dashboard with realms and bounties
- Gamified quests and achievements (trophies, streaks)
- Performance metrics tracking
- Profile management with avatar upload
Keep the implementation simple and readable.

## Development Philosophy

Build feature by feature.
For every feature:

1. Read this file first.

2. Keep the implementation simple.

3. Avoid overengineering.

4. Prefer readable code over clever code.

5. Build the smallest useful version first.

6. Refactor only when repetition appears.

---

## Decision Making

If something is unclear or could be improved, suggest a better
approach. If a new library would significantly help, recommend it,
explain why, and ask before adding it.
Do not install new libraries without approval.

---

## Architecture

Use this folder structure:

```

app/
  (auth)/
  (tabs)/
components/
constants/
constants/
data/
hooks/
lib/
store/
types/
assets/

```

**app/** is for routes and screens only. Screens compose components and
call hooks or stores. They should not contain large reusable UI blocks
or business logic.
**components/** is for reusable UI. Create a component when it is
reused in multiple places, when it makes a screen easier to read, or
when it represents a clear UI concept. Examples for this app:
RealmsSection, StreakCarousel, ProfileStatsCard. Do not create components too early.
**data/** holds hardcoded content. Keep it typed.

**store/** holds Zustand stores. Examples of state to keep here:
profile (UserProfile in userStore), auth (user/loading/loadedOnce in AuthContext). Persist with AsyncStorage when needed.
**lib/** holds external service helpers (clerk.ts, api.ts, cn.ts).
Never expose secret keys here.

---

## UI Rules

For any UI task:

- Replicate the provided design exactly.
- Match layout, spacing, padding, font sizes, font hierarchy, colors,
  border radius, shadows, alignment, and proportions.

- Do not approximate. Do not simplify unless explicitly asked.

---

## Styling Rules

Use StyleSheet for all styling. NativeWind is not installed in this project.

See `constants/theme.md` for the full design token reference (colors, typography, spacing, shadows).

---

## Image Rule

Use centralized image imports.

1. Check if constants/images.ts exists.

2. If not, create it.

3. Import all app images there.

4. Use them through the centralized object.

```ts
import mascot from "@/assets/images/mascot.png";
export const images = {
  mascot,
};
```

```tsx
<Image source={images.mascot} />
```

## Do not import image assets directly inside screens or components.

## State Management

- Zustand for global client state.

- Local state for temporary UI state.

- AsyncStorage for persistence.

---

## TypeScript

- Strict mode.

- No `any`.

- Keep types simple and readable.

---

## Feature Implementation

When building a feature:

1. Read this file first.

2. Identify the files to change.

3. Keep changes focused.

4. Do not rewrite unrelated code.

5. Follow existing patterns.

6. Make sure the feature works end to end.

7. Fix lint and type errors before finishing.

---

## Secrets

- Never expose secret keys in client code.

- Use server routes for tokens, AI calls, and any external API access.

---

## Authentication

## Use Clerk. Do not build custom auth.

## Communication

## Be concise. Explain what changed and how to test it.

## Final Reminder

Before every feature:

- Read this file.

- Follow it strictly.

- Build clean, simple code.

- Replicate UI exactly when designs are provided.
  Practical Vibe Coding for Mobile Apps 22

---

## Tech Stack

- Expo

- React Native

- TypeScript

- Expo Router

- Zustand

- Neon Postgres + Drizzle ORM

- AsyncStorage

- Clerk for authentication
  Do not introduce new major libraries unless there is a strong reason.
  Ask before installing anything new.

---

- **Expo SDK 57** with Expo Router (file-based routing); entrypoint `expo-router/entry`
- **Auth**: Clerk (`@clerk/expo`) — primary auth provider. All auth flows go through Clerk.
- **Data**: Neon Postgres via Drizzle ORM (`db/schema.ts`, `drizzle/`); API is the Express server in `server/`. Uploads use Cloudinary (`lib/cloudinary.ts`, `/api/uploads/cloudinary`).
- **TypeScript**: `strict: true`, path alias `@/*` → `./*` (root).

## Routing

```
app/_layout.tsx         → ClerkProvider → AuthProvider → Stack (auth guard)
  app/index.tsx          → welcome/landing page
  app/(auth)/
    login.tsx            → sign in/up (email + Google/Apple OAuth)
    onboarding.tsx     -> profile setup; created via the API (`POST /api/users`)
  app/(tabs)/
    _layout.tsx          → ResponsiveTabBar (Camp + Quests + Threads + Profile) with center Notes CTA
    index.tsx            → dashboard with stats, courses, schedule
    profile.tsx          → profile view + avatar upload via expo-image-picker
```

**Auth guard** (`_layout.tsx`): After sign-in → redirects to `/(tabs)`. After sign-out → redirects to `/login`.

## Codebase quirks

- Components live in `component/` (not `components/`), assets in `assets/`.
- `app/(tabs)/_layout.tsx` renders `ResponsiveTabBar` (`component/ResponsiveTabBar.tsx`) on compact screens and `AppSidebar` on wide screens. The center floating CTA currently opens Notes; it is being replaced by the AI Tutor.

### Floating Bottom Tab Bar — Layout Spec

The tab bar uses these values for the floating container:

```json
{
  "layoutStyle": {
    "position": "absolute",
    "bottom": 24,
    "left": 16,
    "right": 16,
    "height": 64,
    "backgroundColor": "#121826",
    "borderRadius": 20,
    "borderWidth": 1,
    "borderColor": "#1F293D",
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "space-around",
    "paddingHorizontal": 12,
    "elevation": 8,
    "shadowColor": "#000000",
    "shadowOffset": { "width": 0, "height": 4 },
    "shadowOpacity": 0.3,
    "shadowRadius": 4.65
  },
  "activeStateStyle": {
    "tintColor": "#38BDF8",
    "fontWeight": "600"
  },
  "inactiveStateStyle": {
    "tintColor": "#64748B",
    "fontWeight": "400"
  }
}
```
- `login.tsx` imports Clerk hooks from both `@clerk/expo` (`useOAuth`) and `@clerk/expo/legacy` (`useSignIn`, `useSignUp`). Keep both patterns working until legacy is removed.
- Clerk token cache: native uses `expo-secure-store`, web falls back to `localStorage` (`lib/tokenCache.ts`).
- User profiles are loaded through `contexts/AuthContext.tsx` from the Express API (`/api/users/me`) and persisted in `store/userStore.ts`.
- `.env` contains `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — required for dev. Server env vars live in the repo `.env` (`NEON_DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`).

## Import conventions

Use project root-relative imports: `import { useAuth } from "../../contexts/AuthContext"` or `import { api } from "@/lib/api"` (via `@/*` alias).

## Style conventions

- Color palette: `primaryColor = "#27d436"`, `secondaryColor = "#1A1F3A"`, background `"#F5F5F5"`.
- Font: `Platform.OS === "ios" ? "Arial" : "sans-serif"` (inline, not via expo-font).
- Tab bar active tint: `#38BDF8` (floating bottom tab bar).
- ESLint: auto-fix on save (VSCode settings: `source.fixAll`, `source.organizeImports`, `source.sortMembers`).

## OpenCode config

`opencode.json` exists at the repo root. For reference, its shape is:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENTS.md"]
}
```

Config is loaded once at startup — restart opencode after any changes. Project config goes in `opencode.json`, `.opencode/opencode.json`, or `opencode.jsonc` at the repo root. Global overrides go in `~/.config/opencode/opencode.json`.

## Corrections & Additions

- **`app/(auth)/onboarding.tsx` exists.** Profile setup is handled there. Profile creation goes through `POST /api/users` — and the screen is wired into the auth flow.
- **TabBar lives in `component/ResponsiveTabBar.tsx`** and is rendered by `app/(tabs)/_layout.tsx`; wide screens use `component/AppSidebar.tsx`.
- **Mixed `.jsx`/`.tsx`** — all components are `.tsx`. Be aware when refactoring.
- **`ErrorBoundary`** is a class component at `component/ErrorBoundary.tsx`.
- **`app.json` experiments** — `typedRoutes: true`, `reactCompiler: true` are enabled.
- **Theme system (light + dark, runtime switchable)**: `constants/themes.ts` defines `ThemeColors` plus two palettes — `appTheme` (dark, `bg #152A4D`) and `lightTheme` ("Azure" premium light, `bg #F5F7FB`, `primary #2563EB` blue) — and `themeFor(resolved)`. `hooks/useTheme.ts` exposes reactive `useThemeColors()` and `useThemeMode()` backed by persisted `store/themeStore.ts` (`mode: "dark" | "light" | "system"`, default `"dark"`). Settings → **Appearance** lets users pick Light / Dark / System. Status bars in the root/tutor/schedule/notes/settings layouts adapt to the resolved mode. **Do not import `appTheme`/`lightTheme` at module scope for colors** — resolve via `useThemeColors()` and apply inline so screens adapt. Intentionally always-dark surfaces: Coach (`constants/coachTheme.ts`), lesson theater (`constants/lessonTheater.ts`), `LoadingScreen` splash, and the `SpinWheel` overlay.
- **Loading screen**: `component/LoadingScreen.tsx` renders `MascotAnimation action="mascot_loading"` centered on `#152A4D` (the old animated GIF was deleted); no pulse animation or static logo.
- **`createStyles(theme)` pattern removed** — all 7 files that used `StyleSheet.create()` inside render functions were converted to module-level static `StyleSheet.create()` with theme-dependent colors applied as inline style overrides. See `app/(tabs)/quests.tsx`, `component/TrophyGridSection.tsx`, `component/StreakCarousel.tsx`, `component/ProfileStatsCard.tsx`, `component/TrophyCabinetSection.tsx`, `app/(course)/[courseId].tsx`, `app/(course)/[courseId]/chapter/[chapterIndex].tsx`.
- **`.jsx` → `.tsx`**: `StreakCarousel.jsx`, `TrophyCabinetSection.jsx`, `ProfileStatsCard.jsx` were renamed to `.tsx` and migrated to TypeScript + useThemeColors. `LoadingScreen.jsx` → `LoadingScreen.tsx`.
- **AI model picker (multi-provider)**: The app is actually Expo **SDK 57**, not 54 (package.json: expo `^57`, RN 0.86). Settings → "AI Model" lets users pick a cloud model (Gemini/OpenAI/Anthropic/OpenRouter) for text/JSON generation (course, bounties, quiz, study, notes AI). Architecture: shared model registry `lib/providers/modelRegistry.ts` (pure, client+server); thin injection shell `lib/providers/generateText.ts`; SDK dispatch lives server-side in `server/ai/text.ts` (openai + @anthropic-ai/sdk installed in `server/package.json` only, NOT root). Client passes `x-ai-model: provider::model` header (from persisted `store/modelStore.ts`) on generation endpoints in `lib/api.ts`; server validates via allowlist in `resolveAiModel` (fallback `gemini::gemini-2.5-flash`). Embeddings (`text-embedding-004`) + thumbnail image gen stay Gemini-only. `server/index.ts` requires only `GEMINI_API_KEY` at startup; OpenAI/Anthropic/OpenRouter keys are optional env vars (warning only). The server is its own npm package (`server/package.json` + nested `node_modules`); run it with `npm run start:server` from root.
- **Offline Gemma (Phase B, shipped)**: On-device Gemma via `expo-ai-kit` (dev-build only; `llm: true` plugin in `app.json`). Lazy-loaded in `lib/providers/offline.ts` so Expo Go doesn't crash — **critical**: the kit must be loaded with a try/catch `require("expo-ai-kit")` (NOT `import()`, which Metro eagerly evaluates at bundle init and crashes on `requireNativeModule("ExpoAiKit")` in Expo Go); unavailable ⇒ `offlineSupported()=false`. Settings → "Offline AI" card + "On-device" group in the model picker let users download/activate `gemma-e2b`/`gemma-e4b` via `store/offlineStore.ts`. Powers Notes copilot, Study chat (hybrid RAG: cloud retrieval, local answer), quiz/flashcards/cheatsheet generation, and study review — all fully offline. Web chip and cloud `"all"` streaming are hidden while the offline model is active. Course/bounty/subtopic generation requires cloud and degrades back to the server provider. Offline model refs (`offline::…`) are never sent to the server — `aiModelHeaders()` falls back to `AI_MODEL_DEFAULT`.
- **AI error surfacing & model fallback (shipped)**: `sendRouteError` (`server/index.ts`) used to mask every 5xx as the generic `"Internal server error"`, so the real AI/provider cause was invisible. Now: (1) `AiProviderError` (`server/ai/text.ts`) carries `expose = true` and its user-safe message is surfaced regardless of status; AI output-validation errors in `lib/gemini.ts` throw with `statusCode = 422` so they surface too. (2) `mapProviderError` normalizes raw Gemini/OpenAI/Anthropic/OpenRouter SDK errors into friendly messages with accurate 4xx/5xx statuses (only OpenRouter had this before). (3) `dispatch()` in `server/ai/text.ts` auto-retries once with `AI_MODEL_DEFAULT` when a model is unavailable (404), the provider is overloaded/unreachable (503), or no key is configured (`AiConfigError`), and logs a `WARN` fallback line. (4) `sendRouteError` logs full detail (name/message/stack) with a request id and adds `requestId` (5xx) / `code` to the response body. (5) `console.error`/`console.warn` are mirrored to `server.log` (gitignored) so errors persist after the terminal scrolls; the client `apiFetch` (`lib/api.ts`) logs method/path/status/code/requestId in dev. Note: the `OPENROUTER_API_KEY` in this repo's `.env` was rejected (401) when last tested — pick a Gemini model or supply a valid OpenRouter key in Settings → AI Model.
- **Web performance architecture (shipped)**: Web is an SPA (`app.json` `web.output: "single"`) with **async routes enabled web-only** (`plugins: [["expo-router", { "asyncRoutes": { "web": true, "default": false } }]]`, SDK 57 opt-in) — the old single entry was ~3.9MB raw / 1.04MB gzip; now the initial JS is `entry` (~1.05MB raw / 0.27MB gzip) + `__common` (~1.53MB / 0.44MB) plus a small landing route chunk, and other routes (login/onboarding/tabs/coach/course) load on demand. `app/index.web.tsx` renders only `LandingPage`; `app/index.tsx` is native-only (`NativeWelcome`). Root `useFonts` is non-blocking (render immediately with fallback, swap later) and imports 4 SpaceGrotesk weights via subpaths (`@expo-google-fonts/space-grotesk/400Regular`, etc.) so unused weights/italics aren't emitted; coach routes load PlusJakarta subpaths. `component/landing/LandingIcon.tsx` is an inline-SVG icon set that replaces `MaterialCommunityIcons` on all landing/HeroVisual components so the 1.3MB MCI font is not requested on `/`; `AfricaSection` flags (54 remote `flagcdn.com/w80` images) are gated by `hooks/useInViewport.ts`.
- **Adaptive web mascots (poster-first, network-aware)**: `scripts/build-web-mascot.ts` (`npm run media:mascots:web`) generates `assets/mascot/gamification/web/{action}-poster.webp` (static poster) and `{action}-web.webp` (compact animated variant, trimmed to 4-6s, lower fps) from the source MP4/WebPs. Every web animation has a **hard 160KB cap**; if the encoder can't fit it, the poster is copied into the animated slot so web never downloads a multi-MB file. `constants/mascotWebImages.ts` is `null` on native; `.web.ts` maps the generated assets. `lib/mascot/selectSource.ts` (tested by `lib/mascot/selectSource.test.ts`) picks the asset: native always uses the original; web shows the **poster** when offscreen, on slow/save-data connections (`hooks/useNetworkProfile.ts`), or when `hooks/usePrefersReducedMotion.ts` matches, and only swaps to the compact animation when the mascot is in view on a fast connection. `motion="static"` forces the poster (web loading screen); `defer` holds the animation until `requestIdleCallback` (landing hero). The poster is also the animated image's `expo-image` placeholder. The landing page no longer blocks on auth loading (`app/_layout.tsx` renders public routes while Clerk settles).
- **"Chapter not found" from Explore (fixed)**: `fetchCourses` (`store/courseStore.ts`) used to rebuild the store as `[...generating, ...GET /api/courses result]`, and that endpoint returns **only owned + enrolled** courses — so a course browsed via Explore (`ExploreReels.ensureCourse` → `upsertCourse`) was silently evicted on any refetch (Camp/Quests mount, pull-to-refresh, `complete()`), flipping the open chapter screen to "Chapter not found". Fixes: (1) `fetchCourses` now retains other users' already-loaded courses (own courses still drop when the server no longer returns them, preserving real-deletion behavior); (2) the chapter screen self-heals — it re-fetches the course by id when missing (deep link/cold start/evicted), shows a spinner, and its not-found view now has a header back button + Retry/Go back instead of a dead end; (3) `ExploreReels.ensureCourse(post, minChapters)` treats a cached copy too short for the tapped chapter as stale.
