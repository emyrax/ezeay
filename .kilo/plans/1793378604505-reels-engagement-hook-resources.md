# Reels Engagement, Subtopic Hooks, and Shared Resources Plan

## Goal
Make Explore reels more engaging/retentive/hooking, add a `hook` field to each subtopic generated during course generation, and leave room for sharing external resources alongside reels.

## Scope
- Client: `component/ExploreReels.tsx` (ReelCard rendering, hook overlay, reveal gate, streak chip, boss reel cadence, resource share slot)
- Types: `types/chapter.ts` (Subtopic.hook), `types/community.ts` (FeedSubtopic.hook)
- Server: `server/prompts/courseGeneration.ts` (require hook per subtopic), `server/index.ts` (persist hook in chapters JSON, ensure lesson generation reads it)
- Data flow: course generation -> chapters JSON with hooks -> feed -> reel rendering

## Decisions
1. Hook field: add optional `hook?: string` to `Subtopic` and `FeedSubtopic` (2-3 word curiosity-gap phrase). Backward compatible (optional).
2. Generation: prompt requires `hook` for every subtopic; validation rejects missing; fallback derives from title if absent.
3. Rendering: ReelCard shows hook overlay (auto-fade) using `item.subtopic.hook` or title-derived hook; reveal gate blurs content until user taps Reveal; streak chip corner; boss reel badge every 5th reel.
4. Resources: add optional `resources?: {title,url,type}[]` to Subtopic/FeedSubtopic and a "Resources" rail action in ReelCard (opens share sheet / in-app viewer) with empty state placeholder to leave room for future sharing.
5. No new libraries; reuse existing BlurView/Animated.

## Tasks (ordered)
1. Types: add `hook?: string` and `resources?: ReelResource[]` to Subtopic (types/chapter.ts) and FeedSubtopic (types/community.ts). Define `ReelResource`.
2. Prompt: update courseGeneration prompt to require hook + optional resources array per subtopic; add validation in server course generation handler.
3. Server: persist hooks/resources in chapters JSON; ensure feed endpoint returns them; lesson generation unaffected.
4. Client: ExploreReels ReelCard:
   - hook overlay uses hook field with fallback.
   - reveal gate: blur content until tap Reveal.
   - streak chip corner (read from userStore/streak if available, else placeholder).
   - boss reel badge every 5th reel.
   - resources rail action (placeholder opens share sheet listing resources).
5. Validation: tsc --noEmit + lint.

## Risks
- Backward compat with old courses lacking hook: fallback derivation.
- Reveal gate must not block tap-to-open chapter; use separate Reveal button.
- Resources empty state must not break layout.

## Validation
- tsc --noEmit
- npm run lint
- Manual: generate course, verify hooks present; reel shows hook overlay and reveal gate.

## Open questions
- Streak source: confirm userStore has streak; if not, placeholder "🔥 streak" until wired.
