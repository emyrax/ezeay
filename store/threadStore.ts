import { create } from "zustand";
import { api, friendlyError } from "../lib/api";
import { eventBus } from "../lib/eventBus";
import type {
  ThreadComment,
  ThreadFollowResponse,
  ThreadPost,
} from "../types/thread";

const PAGE_SIZE = 20;

type GetToken = () => Promise<string | null>;

interface FeedOptions {
  refresh?: boolean;
  includeMine?: boolean;
}

interface ThreadStore {
  posts: ThreadPost[];
  loaded: boolean;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  seed: number | null;
  nextOffset: number | null;
  hasMore: boolean;
  includeMine: boolean;
  chapterThreads: Record<string, ThreadPost[]>;
  chapterLoading: Record<string, boolean>;

  fetchFeed: (getToken: GetToken, options?: FeedOptions) => Promise<void>;
  loadMore: (getToken: GetToken) => Promise<void>;
  refresh: (getToken: GetToken, includeMine?: boolean) => Promise<void>;
  setIncludeMine: (value: boolean) => void;

  fetchChapterThread: (
    chapterId: string,
    getToken: GetToken,
    options?: { force?: boolean },
  ) => Promise<ThreadPost[]>;
  getChapterThread: (chapterId: string) => ThreadPost[];

  likePost: (postId: string, getToken: GetToken) => Promise<void>;
  followUser: (userId: string, getToken: GetToken) => Promise<ThreadFollowResponse | null>;
  challengeUser: (
    userId: string,
    postId: string | undefined,
    getToken: GetToken,
  ) => Promise<boolean>;
  syncAuthorState: (
    userId: string,
    updates: Partial<Pick<ThreadPost["author"], "isFollowing" | "followersCount" | "isChallenged">>,
  ) => void;
  addComment: (postId: string, body: string, getToken: GetToken) => Promise<ThreadComment>;
  getComments: (postId: string, getToken: GetToken) => Promise<ThreadComment[]>;
}

function patchPost(
  state: Pick<ThreadStore, "posts" | "chapterThreads">,
  postId: string,
  updater: (post: ThreadPost) => ThreadPost,
): Pick<ThreadStore, "posts" | "chapterThreads"> {
  return {
    posts: state.posts.map((post) => (post.id === postId ? updater(post) : post)),
    chapterThreads: Object.fromEntries(
      Object.entries(state.chapterThreads).map(([key, list]) => [
        key,
        list.map((post) => (post.id === postId ? updater(post) : post)),
      ]),
    ),
  };
}

function patchAuthor(
  state: Pick<ThreadStore, "posts" | "chapterThreads">,
  userId: string,
  updater: (post: ThreadPost) => ThreadPost,
): Pick<ThreadStore, "posts" | "chapterThreads"> {
  const apply = (post: ThreadPost) => (post.authorId === userId ? updater(post) : post);
  return {
    posts: state.posts.map(apply),
    chapterThreads: Object.fromEntries(
      Object.entries(state.chapterThreads).map(([key, list]) => [key, list.map(apply)]),
    ),
  };
}

function allCachedPosts(state: Pick<ThreadStore, "posts" | "chapterThreads">): ThreadPost[] {
  return [...state.posts, ...Object.values(state.chapterThreads).flat()];
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  posts: [],
  loaded: false,
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,
  seed: null,
  nextOffset: null,
  hasMore: true,
  includeMine: false,
  chapterThreads: {},
  chapterLoading: {},

  fetchFeed: async (getToken, options = {}) => {
    const state = get();
    if (state.loading || state.refreshing) return;
    const isFirstPage = options.refresh || !state.loaded;
    if (!isFirstPage && (state.loadingMore || !state.hasMore)) return;

    const includeMine = options.includeMine ?? state.includeMine;
    const token = await getToken();
    if (!token) {
      set({ posts: [], loaded: true, loading: false, refreshing: false, error: null });
      return;
    }

    set(
      isFirstPage
        ? { loading: !options.refresh, refreshing: !!options.refresh, error: null, includeMine }
        : { loadingMore: true, error: null },
    );

    try {
      const seed = isFirstPage && options.refresh ? undefined : (state.seed ?? undefined);
      const page = await api.community.subtopicFeed(token, {
        limit: PAGE_SIZE,
        offset: isFirstPage ? 0 : (state.nextOffset ?? 0),
        includeMine,
        seed,
      });

      set((current) => {
        const incoming = isFirstPage
          ? page.items
          : page.items.filter(
              (item) => !current.posts.some((existing) => existing.id === item.id),
            );
        return {
          posts: isFirstPage ? incoming : [...current.posts, ...incoming],
          seed: page.seed,
          nextOffset: page.nextOffset,
          hasMore: page.hasMore,
          loaded: true,
          loading: false,
          loadingMore: false,
          refreshing: false,
          error: null,
          includeMine,
        };
      });
    } catch (err) {
      set({
        loaded: true,
        loading: false,
        loadingMore: false,
        refreshing: false,
        error: friendlyError(err, "Couldn't load threads."),
      });
      if (isFirstPage) {
        eventBus.emit("toast:error", {
          title: friendlyError(err, "Couldn't load threads."),
        });
      }
    }
  },

  loadMore: async (getToken) => {
    const state = get();
    if (!state.loaded || !state.hasMore || state.loadingMore || state.loading) return;
    await get().fetchFeed(getToken, { includeMine: state.includeMine });
  },

  refresh: async (getToken, includeMine) => {
    await get().fetchFeed(getToken, {
      refresh: true,
      includeMine: includeMine ?? get().includeMine,
    });
  },

  setIncludeMine: (value) => set({ includeMine: value }),

  fetchChapterThread: async (chapterId, getToken, options = {}) => {
    const cached = get().chapterThreads[chapterId];
    if (cached && !options.force) return cached;
    if (get().chapterLoading[chapterId]) return cached ?? [];

    set((state) => ({
      chapterLoading: { ...state.chapterLoading, [chapterId]: true },
    }));

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const response = await api.community.chapterThread(chapterId, token);
      set((state) => ({
        chapterThreads: { ...state.chapterThreads, [chapterId]: response.items },
        chapterLoading: { ...state.chapterLoading, [chapterId]: false },
      }));
      return response.items;
    } catch (err) {
      set((state) => ({
        chapterLoading: { ...state.chapterLoading, [chapterId]: false },
      }));
      eventBus.emit("toast:error", {
        title: friendlyError(err, "Couldn't load this chapter."),
      });
      return cached ?? [];
    }
  },

  getChapterThread: (chapterId) => get().chapterThreads[chapterId] ?? [],

  likePost: async (postId, getToken) => {
    const existing = allCachedPosts(get()).find((post) => post.id === postId);
    if (!existing) return;

    const nextLiked = !existing.isLikedByMe;
    const nextCount = Math.max(0, existing.likesCount + (nextLiked ? 1 : -1));

    set((state) =>
      patchPost(state, postId, (post) => ({
        ...post,
        isLikedByMe: nextLiked,
        likesCount: nextCount,
      })),
    );

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const result = await api.community.likeThreadPost(postId, token);
      set((state) =>
        patchPost(state, postId, (post) => ({
          ...post,
          isLikedByMe: result.liked,
          likesCount: result.likesCount,
        })),
      );
    } catch (err) {
      set((state) =>
        patchPost(state, postId, (post) => ({
          ...post,
          isLikedByMe: existing.isLikedByMe,
          likesCount: existing.likesCount,
        })),
      );
      eventBus.emit("toast:error", { title: friendlyError(err, "Like failed") });
    }
  },

  followUser: async (userId, getToken) => {
    const cached = allCachedPosts(get()).find((post) => post.authorId === userId);
    if (!cached) return null;

    const wasFollowing = cached.author.isFollowing;
    const previousCount = cached.author.followersCount;
    const nextCount = Math.max(0, previousCount + (wasFollowing ? -1 : 1));

    set((state) =>
      patchAuthor(state, userId, (post) => ({
        ...post,
        author: {
          ...post.author,
          isFollowing: !wasFollowing,
          followersCount: nextCount,
        },
      })),
    );

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const result = wasFollowing
        ? await api.community.unfollowUser(userId, token)
        : await api.community.followUser(userId, token);
      set((state) =>
        patchAuthor(state, userId, (post) => ({
          ...post,
          author: {
            ...post.author,
            isFollowing: result.following,
            followersCount: result.followersCount,
          },
        })),
      );
      eventBus.emit("toast:success", {
        title: result.following ? "Following" : "Unfollowed",
      });
      return result;
    } catch (err) {
      set((state) =>
        patchAuthor(state, userId, (post) => ({
          ...post,
          author: {
            ...post.author,
            isFollowing: wasFollowing,
            followersCount: previousCount,
          },
        })),
      );
      eventBus.emit("toast:error", {
        title: friendlyError(err, "Couldn't update follow"),
      });
      return null;
    }
  },

  challengeUser: async (userId, postId, getToken) => {
    const cached = allCachedPosts(get()).find((post) => post.authorId === userId);
    if (!cached) return false;
    if (cached.author.isChallenged) {
      eventBus.emit("toast:info", { title: "Challenge already sent" });
      return true;
    }

    set((state) =>
      patchAuthor(state, userId, (post) => ({
        ...post,
        author: { ...post.author, isChallenged: true },
      })),
    );

    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      await api.community.challengeUser(userId, token, postId);
      eventBus.emit("toast:success", {
        title: "Challenge sent",
        message: `${cached.author.name ?? "This learner"} was challenged.`,
      });
      return true;
    } catch (err) {
      set((state) =>
        patchAuthor(state, userId, (post) => ({
          ...post,
          author: { ...post.author, isChallenged: false },
        })),
      );
      eventBus.emit("toast:error", {
        title: friendlyError(err, "Couldn't send challenge"),
      });
      return false;
    }
  },

  syncAuthorState: (userId, updates) => {
    set((state) =>
      patchAuthor(state, userId, (post) => ({
        ...post,
        author: { ...post.author, ...updates },
      })),
    );
  },

  addComment: async (postId, body, getToken) => {
    const token = await getToken();
    if (!token) throw new Error("Not signed in");
    const result = await api.community.addThreadComment(postId, body, token);
    set((state) =>
      patchPost(state, postId, (post) => ({
        ...post,
        commentsCount: post.commentsCount + 1,
      })),
    );
    return result.comment;
  },

  getComments: async (postId, getToken) => {
    const token = await getToken();
    if (!token) throw new Error("Not signed in");
    const result = await api.community.threadComments(postId, token);
    return result.comments;
  },
}));
