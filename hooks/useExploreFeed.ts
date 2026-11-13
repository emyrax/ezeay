import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { CommunityFeedPost } from "../types/community";

export type ExploreFeedFilter = "resources" | "courses";

export function matchesExploreFeedFilter(
  post: CommunityFeedPost,
  filter: ExploreFeedFilter,
): boolean {
  return filter === "resources" ? Boolean(post.resourcePost) : !post.resourcePost;
}

const PAGE_SIZE = 20;
const INITIAL_PAGE_LIMIT = 4;
const MORE_PAGE_LIMIT = 3;
const INITIAL_MIN_MATCHES = 6;

type LoadMode = "initial" | "refresh" | "more";

export function useExploreFeed(
  getToken: () => Promise<string | null>,
  filter: ExploreFeedFilter,
  refreshKey = 0,
) {
  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(false);
  const inFlightRef = useRef(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const run = useCallback(
    async (mode: LoadMode) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);

      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error("Not signed in");

        const append = mode === "more";
        let cursor = append ? cursorRef.current : null;
        let offset = append && cursor ? 0 : append ? offsetRef.current : 0;
        let more = true;
        let rawFetched = 0;
        const matched: CommunityFeedPost[] = [];
        const seen = new Set<string>();
        const pageLimit = append ? MORE_PAGE_LIMIT : INITIAL_PAGE_LIMIT;
        const target = append ? 1 : INITIAL_MIN_MATCHES;

        for (let page = 0; page < pageLimit && more; page++) {
          const feed = await api.community.feed(
            token,
            PAGE_SIZE,
            false,
            offset,
            cursor,
          );
          rawFetched += feed.posts.length;
          for (const post of feed.posts) {
            if (!matchesExploreFeedFilter(post, filter)) continue;
            if (seen.has(post.id)) continue;
            seen.add(post.id);
            matched.push(post);
          }
          more = Boolean(feed.hasMore);
          cursor = feed.nextCursor ?? null;
          offset = cursor ? 0 : offset + feed.posts.length;
          if (matched.length >= target) break;
        }

        offsetRef.current = append ? offsetRef.current + rawFetched : rawFetched;
        cursorRef.current = cursor;
        hasMoreRef.current = more;
        setHasMore(more);

        if (append) {
          setPosts((prev) => {
            const existing = new Set(prev.map((post) => post.id));
            const next = [...prev];
            for (const post of matched) {
              if (existing.has(post.id)) continue;
              existing.add(post.id);
              next.push(post);
            }
            return next;
          });
        } else {
          setPosts(matched);
        }
        setError(null);
      } catch (err) {
        console.error("[ExploreFeed] load failed:", err);
        setError("Couldn't load this feed. Pull to refresh.");
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void run(refreshKey > 0 ? "refresh" : "initial");
  }, [run, refreshKey]);

  const refresh = useCallback(() => {
    void run("refresh");
  }, [run]);

  const loadMore = useCallback(() => {
    if (!hasMoreRef.current) return;
    void run("more");
  }, [run]);

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
