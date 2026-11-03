# Fix: ChapterThreadModal infinite loop from uncached getSnapshot

## Problem
`useThreadStore((s) => s.getChapterThread(chapterId))` calls a store method that returns a new filtered/sorted array every render, causing React's `useSyncExternalStore` snapshot mismatch and infinite update loop.

## Fix
In `component/ChapterThreadModal.tsx`, select `posts` directly from the store (stable reference when unchanged) and derive the chapter thread with `useMemo` keyed on `posts` + `chapterId`. This caches the derived array between renders.

## Validation
- `npx tsc --noEmit`
- `npm run lint`
- Load `/stats` tab without Maximum update depth error.

## Out of scope
No other changes.