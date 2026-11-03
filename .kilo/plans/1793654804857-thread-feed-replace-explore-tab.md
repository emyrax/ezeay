# Plan: Replace /stats EXPLORE tab with Thread-style social feed

## Goal
Replace the legacy reels/explore screen (currently the `/stats` tab, route `/stats`, rendering `component/ExploreReels.tsx`) with a Thread/X.com-style social media & resource-sharing feed across iOS, Android, and Web. Keep the 4-tab bottom bar structure (Camp `/`, Quests `/quests`, Explore `/stats`, Profile `/profile`).

## Decisions (resolved with user)
- **Target route**: Replace `/stats` EXPLORE tab content; keep 4-tab structure. `ExploreReels` and `reelStore` are removed from this route (reelStore may remain for other consumers — do not delete unless confirmed unused).
- **Data model**: Map Thread models to existing types. `UserProfile` → Thread user (`uid`→`id`, `displayName`→`name`, `photoURL`→`avatarUrl`, `xp`→`iqScore`, `bio`→`bio`). New fields `handle`, `followersCount`, `followingCount`, `isFollowing`, `isChallenged` are additive (no backend columns yet — see backend dependency). `CommunityFeedPost` → ThreadPost (`title`→header context, `description`→`content`, `creator`→`author`, `likeCount`→`likesCount`, `likedByMe`→`isLikedByMe`, `sharedAt`→`createdAt`). `resourcePost` → `resourceAttachments[]`.
- **Styling**: StyleSheet only. NativeWind is NOT installed; do not add it without approval (AGENTS.md decision-making). Use `useThemeColors()` tokens, not hardcoded colors.
- **Follow/Challenge**: Functional — requires new backend API endpoints (`POST /api/users/:id/follow`, `DELETE /api/users/:id/unfollow`, `POST /api/community/feed/:id/challenge` or equivalent). Marked as a backend dependency; frontend implements optimistic UI and calls these endpoints.
- **iqScore**: maps to existing `xp` field (no new backend profile field).
- **Constraint**: ProfileCardModal must have exactly two action buttons (Follow, Challenge) and ZERO messaging triggers/UI. Enforce in review.

## Files to change (affected boundary)
1. `app/(tabs)/stats.tsx` — replace `ExploreReels` with `ThreadFeedScreen`; keep `ErrorBoundary`, `ScreenContainer`, refresh wiring.
2. `app/(tabs)/_layout.tsx` — likely no change (tabs unchanged), but verify tab screen name `stats` still maps to `stats.tsx`.
3. `constants/navigation.ts` — update `TAB_ITEMS` entry for `stats`: title "EXPLORE" → "THREADS" (optional), icon `compass-outline` → consider "message-circle"/"threads". Keep href `/stats`.
4. `component/ThreadFeedScreen.tsx` — new: entry point, responsive shell, FlatList feed, pull-to-refresh, FAB to open ResourceUploadModal.
5. `component/ThreadCard.tsx` — new: post item (author header w/ iqScore badge, content, resource attachment previews, interaction bar Like/Comment/Challenge).
6. `component/ProfileCardModal.tsx` — new: X.com-style profile preview modal (avatar, bio, followers/following, iqScore, Follow + Challenge buttons only).
7. `component/ResourceUploadModal.tsx` — new: compose thread + attach image/document/link, publish.
8. `component/CommentsModal.tsx` — new: nested comments on a thread.
9. `store/threadStore.ts` — new Zustand store: posts, likedPostIds, followingIds, fetchFeed, likePost (optimistic), followUser, challengeUser, createPost, addComment.
10. `types/thread.ts` — new: `ThreadUser`, `ThreadPost`, `ThreadResourceAttachment`, `ThreadComment` types (mapped from existing).
11. `lib/api.ts` — add `community.follow(userId, token)`, `community.unfollow(userId, token)`, `community.challengeThread(postId, token)` endpoints (or extend existing). Backend must implement these.
12. `lib/reels/challenge.ts` — leave untouched (reel challenge logic remains for other consumers).
13. `component/ExploreReels.tsx` — remove usage from `/stats`; decide deletion only after confirming no other route imports it (only `stats.tsx` imports it currently).

## Responsive strategy (no NativeWind)
- Mobile (iOS/Android): full-width edge-to-edge FlatList feed.
- Web: centered container `maxWidth: 680`, `marginHorizontal: auto`, flanked by empty space.
- Use `useWindowDimensions()` + existing `useResponsive()`/`useTabBarInset()`.
- Modals: `presentationStyle="pageSheet"` on mobile; centered backdrop-blur dialog on web (`Platform.OS === "web"`).
- Scroll: `FlatList` everywhere (virtualized). No FlashList unless installed (not in package.json).

## Data flow
- `ThreadFeedScreen` calls `useThreadStore((s) => s.fetchFeed(token))` on mount/focus and refresh.
- `ThreadCard` like: optimistic flip in `threadStore.likePost`, reconcile on server response (mirror existing `ExploreReels.toggleLike` pattern).
- Tap author → open `ProfileCardModal` with `ThreadUser` (fetch via `api.users.get` if not cached; `handle`/`followersCount`/`followingCount`/`isFollowing` derived or placeholder until backend provides).
- Tap Challenge → `threadStore.challengeUser(postId, token)` → toast success/failure; no messaging UI anywhere.
- FAB → `ResourceUploadModal` → `api.community.resources.create` (existing endpoint) to publish; prepend new post to feed.
- Tap Comment → `CommentsModal` → `api.community.posts.comment` (existing endpoint).

## Error handling & validation (AGENTS.md requirement)
- Wrap screen in `ErrorBoundary` (existing pattern).
- Every async API call: try/catch, set error state, show user-safe message (use `lib/api.ts` `friendlyError`).
- Loading states on feed load, like, follow, challenge, upload.
- Empty state: "No threads yet. Be the first to share."
- Network failure: "Can't reach the server. Check your connection and try again."

## Backend dependency (must be called out — not implemented by this plan)
New endpoints required for functional Follow/Challenge:
- `POST /api/users/:id/follow` → `{ following: boolean, followersCount: number }`
- `DELETE /api/users/:id/unfollow` → `{ following: boolean, followersCount: number }`
- `POST /api/community/feed/:postId/challenge` (or `/api/community/threads/:id/challenge`) → challenge result
- Profile fields `handle`, `followersCount`, `followingCount`, `isChallenged` on `GET /api/users/:id`
Frontend should gracefully degrade (toast "Follow/Challenge not available yet") if these endpoints return 404/501 until backend is ready.

## Validation steps (implementation agent must run)
1. `npm run typecheck` — `tsc --noEmit`, strict mode, no `any`.
2. `npm run lint` — `expo lint`, zero errors on changed files.
3. Confirm no import of `ExploreReels` remains in `app/(tabs)/stats.tsx`.
4. Confirm ProfileCardModal has no messaging button/icon/text (grep for "message", "DM", "chat", "messenger" in new components — only CommentsModal chat is allowed).
5. Manual smoke: feed loads, like toggles, follow toggles, challenge toast, upload creates post, comments open, responsive web width centers at max 680px.
6. Existing reel consumers of `reelStore` / `lib/reels/challenge.ts` must still compile (do not delete shared code).

## Out of scope for this phase
- NativeWind installation.
- New backend implementation (endpoints noted as dependency).
- `iqScore` as a separate backend field (maps to `xp`).
- Deleting `reelStore.ts` / `lib/reels/challenge.ts` unless confirmed unused elsewhere.
- Any tab-bar structural change beyond label/icon (keep 4 tabs).

## Open questions for implementation agent
- Confirm exact backend base paths for follow/unfollow/challenge (server routes may differ from guesses above).
- Whether `handle`/`followersCount`/`followingCount` should be derived placeholders until backend ships.
