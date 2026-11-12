# Yuinx — Project Plan

A gamified learning companion that builds personalized learning paths around your curiosity.

## Stack

Expo SDK 54 · Expo Router (file-based) · TypeScript (strict) · Zustand + AsyncStorage · Clerk (auth) · Postgres/Neon + Drizzle · Gemini (AI) · Cloudinary (images) · expo-notifications

## Current State (done)

- **Auth** — Clerk sole provider. Google OAuth (`useOAuth`) + email/OTP (legacy). `NavigationGuard` redirects sign-in → `/(tabs)`, sign-out → `/login`. Token cache: SecureStore (native) / localStorage (web).
- **Screens**
  - `index` — animated landing/splash, auto-redirects by auth.
  - `(auth)` — `login.tsx` (built). `onboarding.tsx` exists **but not wired**.
  - `(tabs)` — Camp (dashboard: stats, quick-app grid, courses carousel, bounties), Quests (daily bounties + hidden gems, claim), Stats (level progress, contribution heatmap, streaks, trophies), Profile (avatar, profile fields, theme/notification settings).
  - `(study)` — upload, AI bites/summaries/quizzes/chat, timetable.
  - `(notes)` — rich notes: content, audio clips, images, tags, pinning, reminders.
  - `(course)` — AI-generated courses, chapter-by-chapter learning, quizzes with retries, completion + spin rewards.
  - `(settings)` — 5 themes + custom theme builder, notification/system settings.
- **Economy** — XP/coins, levels + ranks (`services/LevelService.ts`), trophies, daily streaks + offline check-in, spin wheel (3/day, 30-min cooldown).
- **Data / services** — 14 Zustand stores (persisted); Express server (users, courses, enrollments, trophies, study, bounties); Drizzle/Neon schema + RLS; Gemini (`gemini-2.5-flash` + image gen); Cloudinary uploads; dicebear avatars.

## In Progress (branch `myrax` — uncommitted)

- [ ] `app/(tabs)/_layout.tsx` — tab bar redesign: half-height inactive center button (`centerSemiBtn`), notes icon pulse, removed `lazy`.
- [ ] `component/homeScreenTab/HeaderSection.tsx` — removed unused `MAX_LEVEL` import.
- [ ] `lib/color.ts` — new `withAlpha` helper (untracked).
- [ ] Review intent of `lazy` removal; apply `withAlpha` where useful; commit.

## Backlog

### M1 · Functional gaps

- [ ] Wire `(auth)/onboarding.tsx` into the auth flow (new-user redirect + profile creation). — **M**
- [ ] Replace `statsStore` mock-activity fallback with real data. — **M**
- [ ] Server-side validation for client-trust check-in / stats rewards. — **L**

### M2 · Hygiene & polish

- [ ] Rewrite README for Yuinx (replace default Expo template). — **S**
- [ ] Remove `experimental/` and stray `assets/images/## GitHub Copilot Chat.md`. — **S**
- [ ] Fix `(study)` `upload` route mismatch (declared in layout, file missing). — **S**
- [ ] Decide fate of untracked `lib/color.ts` (adopt or remove). — **S**

### M3 · Testing infra

- [ ] Add Jest + React Native Testing Library + `test` script. — **S**
- [ ] Tests for `LevelService`, Zustand stores, key components. — **M**

### M4 · Docs expansion

- [ ] Expand `docs/` (setup, server, DB, AI). — **M**
- [ ] Establish `saveplans/` workflow for design snapshots. — **S**

## Recent Commits (newest first)

- `7dc9865` feat: add ProfileInfoSection component for user profile management
- `e83d3d8` profile screen work
- `77c4264` removed check-in button from HeaderSection (reverted/reworked later)
- `c6a97e5` reordered check-in button
- `2f54a15` implemented check-in feature
- `52e65c0` spin outcomes, upload file, study prompts
- `a6d7e60` course fetching with user ID
- `d7dcfdb` Gemini integration
- `1bad920` header
- `054845b` gemini + others
- `bb80048` profile photo, dropdown select, gradient outline, pill, progress bar, level service
- `5c1c7b0` refactor
- `947c11e` initial commit