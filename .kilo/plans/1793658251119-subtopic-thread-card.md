# Plan: Interlinked Subtopic Thread Feed (stats/threads)

## Goal
Restructure the `/explore/stats` tab (route `stats`, tab label "THREADS") into an interlinked thread feed where every subtopic from every user's chapter is a standalone post, with deep-link breadcrumbs back to its parent chapter and a Twitter/X-style chapter thread expansion. Strictly enforce "no direct messaging/DM/chat" outside of `CommentsModal`. Enforce ≤ 5MB attachment validation.

## Constraints
- PowerShell environment: avoid `grep/sed/head/&&`; use `Select-String`, `Select-Object`, `;`
- Theme: use `bg/surface/surfaceAlt/text/textSecondary/textMuted/primary/info/border/cardBg` from `hooks/useTheme` (no `background`)
- Event bus: `lib/eventBus.emit("toast:success"|"toast:error"|"toast:info", { title })`
- API: `api.community.*` may not exist yet; always guard via `(api as any).community?.method?.(token)` and degrade gracefully
- Existing wiring: `app/(tabs)/stats.tsx` already renders `<ThreadFeedScreen />` inside `ErrorBoundary`/`ScreenContainer` (no refresh-key dance). Keep this.
- Tab: `constants/navigation.ts` already has stats -> "THREADS" / `message-text-outline`; route name/href unchanged.
- Modals: `ProfileCardModal` must remain strictly Follow + Challenge only (no messaging UI). `CommentsModal` is the only allowed chat-like surface.
- Web: center feed at ~680px. Native: full-width single column.

## Current State (from handover)
- `types/thread.ts`: has `ThreadPost` (with `courseSubtopicRef`, `attachments`, `resourceAttachments`, etc.)
- `store/threadStore.ts`: `fetchFeed/likePost/followUser/challengeUser/createPost/addComment` with graceful degradation
- `component/ThreadFeedScreen.tsx`: uses `ThreadCard`, FlatList, pull-to-refresh
- `component/ThreadCard.tsx`: lightweight card
- `component/ProfileCardModal.tsx`: Follow + Challenge only
- `component/CommentsModal.tsx`: exists (comments only)
- `component/ResourceUploadModal.tsx`: exists (has 5MB guard concept)
- `SubtopicThreadCard.tsx` mentioned as provided but not present in repo yet (will need to be added)

## Decisions
- **Post shape**: Keep `ThreadPost` compatible, but extend with optional subtopic/chapter/media fields needed by `SubtopicThreadCard`. Add `SubtopicThreadPost` as a derived/extended type (or make fields optional on `ThreadPost`) to avoid breaking existing code. Prefer extending `ThreadPost` with optional fields: `chapterId`, `chapterTitle`, `subtopicTitle`, `subtopicIndex`, `subtopicCount?`, `mediaType`, `mediaUrl?`. Keep `courseSubtopicRef` for backward compat.
- **Feed source**: Build a "subtopic extraction engine" in the store/service layer. Aggregate all subtopics from all user chapters into flat items. If courses/chapters data isn't exposed via existing APIs, create a client-side mapper that can pull from `store/courseStore`/Firestore sources already used by the app. Degrade gracefully if unavailable (fall back to existing `api.community.getThreadFeed` shape).
- **Randomization**: Shuffle the aggregated subtopic list on each feed load/refresh (Fisher-Yates). Do not persist shuffle order.
- **Chapter thread view**: Add `ChapterThreadModal` (native `pageSheet`, web centered overlay) to show ordered subtopics of a chapter as a Twitter-style thread sequence. Tapping chapter breadcrumb opens this modal.
- **Profile modal**: Keep `ProfileCardModal` as-is (strictly Follow + Challenge). No DM/messaging UI anywhere else.
- **Likes**: `SubtopicThreadCard` may use local like state for snappy UI; `threadStore.likePost` remains source of truth with optimistic update + rollback (already implemented).
- **Validation**: Enforce ≤ 5MB for attachments in `ResourceUploadModal` (and any upload path). Add `isFileSizeAllowed(bytesOrMb)` check.
- **No new deps**: Use existing `@expo/vector-icons`, `react-native`, `zustand`, `AsyncStorage` patterns.

## Files to Change/Create
| File | Action | Notes |
|---|---|---|
| `types/thread.ts` | Edit | Add optional fields to `ThreadPost` for subtopic/chapter/media: `chapterId?`, `chapterTitle?`, `subtopicTitle?`, `subtopicIndex?`, `subtopicCount?`, `mediaType?: 'video'|'visual_lesson'|'quiz'|'document'`, `mediaUrl?: string`. Keep existing fields. |
| `store/threadStore.ts` | Edit | Add `fetchSubtopicFeed` or extend `fetchFeed` to aggregate subtopics, map to post shape, shuffle. Add helpers to build chapter thread list. Keep graceful degradation. |
| `component/SubtopicThreadCard.tsx` | Create | X.com-style card with chapter breadcrumb (`Chapter: ... • Step X of Y`), author header (avatar/name/handle), IQ badge, Follow/Challenge triggers, content/media preview, attachments (≤5MB display), like/comment/share, taps to open lesson/quiz or chapter thread. Use local like state but sync via store. |
| `component/ChapterThreadModal.tsx` | Create | Modal showing ordered subtopics of a chapter as thread sequence. Native pageSheet, web overlay. Reuse `SubtopicThreadCard` in thread mode or simplified list. |
| `component/ThreadFeedScreen.tsx` | Edit | Replace `ThreadCard` with `SubtopicThreadCard`. Wire callbacks: `onPressSubtopic` (navigate to lesson/player), `onPressChapterThread` (open `ChapterThreadModal`), `onPressProfile` (open `ProfileCardModal`), `onToggleLike`, `onToggleFollow`, `onToggleChallenge`. Manage modals state. |
| `component/ProfileCardModal.tsx` | Verify/Edit | Ensure strictly Follow + Challenge only. No message/DM/chat buttons. Already matches; just verify. |
| `component/ResourceUploadModal.tsx` | Edit | Ensure `isFileSizeAllowed()` enforces ≤ 5MB. Show clear error toast on violation. |
| `app/(tabs)/stats.tsx` | Verify | Already renders `ThreadFeedScreen`. No changes needed unless routing differs. |
| `constants/navigation.ts` | Verify | Already updated to THREADS. No changes. |

## Implementation Details
### types/thread.ts
Add optional fields:
```ts
export interface ThreadPost {
  // ...existing
  chapterId?: string;
  chapterTitle?: string;
  subtopicTitle?: string;
  subtopicIndex?: number;
  subtopicCount?: number;
  mediaType?: 'video' | 'visual_lesson' | 'quiz' | 'document';
  mediaUrl?: string;
}
```
This keeps backward compatibility.

### Subtopic extraction & randomization
In `threadStore.ts`, extend `fetchFeed`:
1. Try `api.community.getSubtopicThreadFeed?.(token)` first (if exists)
2. Else try to aggregate from local stores: scan `useCourseStore` for all chapters/subtopics across users. Map each subtopic to `ThreadPost` shape with `chapterId/chapterTitle/subtopicTitle/subtopicIndex/subtopicCount/mediaType`.
3. If nothing found, fall back to existing `getThreadFeed` (degrade gracefully)
4. Shuffle with Fisher-Yates
5. Set `posts: shuffled`

Also add `getChapterThread(chapterId)` helper to filter posts by chapterId sorted by `subtopicIndex`.

### SubtopicThreadCard
- Breadcrumb: `Chapter: {chapterTitle} • Step {subtopicIndex} of {subtopicCount}` (pressable -> open chapter thread)
- Header: avatar, name/@handle, IQ badge (prominent), Follow/Challenge buttons (or trigger modal via callback)
- Content: show `subtopicTitle` + preview of `content`
- Media: render based on `mediaType` (video/visual_lesson/quiz/document) with `mediaUrl` preview if present
- Attachments: list with type + size
- Actions: Like, Comment, Share. No DM/messaging
- Taps: whole card or specific areas -> `onPressSubtopic(post)` to navigate to lesson/player/quiz

### ChapterThreadModal
- Native: `Modal` with `presentationStyle="pageSheet"`, header with chapter title, FlatList of subtopics in order
- Web: fixed overlay centered, max-width ~680px
- Each item uses `SubtopicThreadCard` or simplified row; tapping subtopic navigates to lesson

### 5MB validation
In `ResourceUploadModal.tsx`:
- Compute size in MB from bytes
- `isFileSizeAllowed = (sizeMb) => sizeMb <= 5`
- On select/upload: if > 5MB, show toast via `eventBus.emit("toast:error", { title: "File too large (max 5MB)" })` and reject

## Validation Plan
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Grep for messaging: only `CommentsModal` should contain messaging-related terms
- [ ] Manual test: feed shows subtopics as standalone cards with breadcrumbs
- [ ] Tap chapter breadcrumb opens chapter thread modal (ordered by subtopicIndex)
- [ ] Tap subtopic opens lesson/quiz/player
- [ ] Profile modal shows only Follow + Challenge
- [ ] Like optimistic + rollback works
- [ ] 5MB upload rejected with toast
- [ ] Web centered at ~680px, native full-width
- [ ] Pull-to-refresh reshuffles/randomizes feed

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| No backend endpoints for subtopic feed | Aggregate from courseStore/Firestore with graceful fallback to existing feed |
| Shuffle on every refresh feels random but acceptable | Spec says randomized feed; keep simple Fisher-Yates |
| Card shape mismatch between `SubtopicThreadCard` and `ThreadPost` | Extend `ThreadPost` with optional fields; make card defensive with optional chaining |
| Double wrapping (ThreadFeedScreen + card both centering) | Card should not force extra container centering; feed already centers at 680px |
| Navigation to lesson needs routing | Use existing router patterns from course/lesson routes |

## Open Questions
- Navigation target for subtopic tap: use `app/(course)/[courseId]/lesson/[chapterIndex]/[subtopicIndex]` or existing route?
- Where to source all chapters across users from client side? May need API or existing stores. If unavailable, fall back to API feed.
- Should shuffle be deterministic per session or true random each refresh? Spec says "randomized feed" - true random on refresh is fine.
