# Plan: Integrate SubtopicThreadCard into Thread Feed

## Goal
Replace generic ThreadCard usage in ThreadFeedScreen with the richer SubtopicThreadCard that supports subtopic breadcrumbs, exam tags, media preview, 5MB attachments, and Follow/Challenge buttons.

## Files to change
- `component/SubtopicThreadCard.tsx` — new component (provided).
- `component/ThreadFeedScreen.tsx` — render SubtopicThreadCard instead of ThreadCard; wire callbacks.
- `types/thread.ts` — align ThreadPost with SubtopicThreadPost fields (subtopicTitle, chapterTitle, mediaType, etc.) or add a separate type.
- `store/threadStore.ts` — fetch feed returning SubtopicThreadPost-shaped data; graceful degradation.

## Decisions
- Keep `ThreadPost` as-is for generic posts; add optional subtopic fields.
- SubtopicThreadCard is self-contained with local like state; store still reconciles.

## Validation
- tsc --noEmit, expo lint.
- No messaging UI (grep).

## Open questions
- Whether to keep both ThreadCard and SubtopicThreadCard or consolidate.
