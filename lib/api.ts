import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Course } from "../types/course";
import type { CourseEnrollment } from "../types/courseEnrollment";
import type {
  LessonExplainAction,
  LessonExplainResponse,
  LessonScript,
} from "../types/lesson";
import type { UserTrophy } from "../types/userTrophy";
import type {
  GenerateCourseInput,
  GenerateCourseResponse,
  GenerateQuizInput,
  GenerateQuizResponse,
} from "../types/courseGeneration";
import type { CollarType, Availability, Education, WorkExperience, Certification } from "../types/user";
import type { StudyMaterial, StudyQuiz, QuizAttempt, StudySuggestion } from "../types/study";
import type {
  TutorChatInput,
  TutorChatResponse,
  TutorConversation,
  TutorMessage,
  TutorMode,
  TutorPersona,
  TutorPlan,
  TutorPreferences,
  TutorQuiz,
  TutorQuizInput,
} from "../types/tutor";
import type {
  AgentActionResult,
  AgentChatInput,
  AgentChatResponse,
  AgentChatStreamDone,
  AgentExecutionRecord,
  AgentIntegrationConnectResponse,
  AgentIntegrationsResponse,
  AgentMemoryInput,
  AgentMemoryRecord,
  AgentMemoryUpdateInput,
  AgentMemoryUploadInput,
  AgentPendingAction,
  AgentProfile,
  AgentProfileInput,
  AgentRoutine,
  AgentRoutineInput,
  AgentRoutineRun,
  AgentStep,
} from "../types/agent";
import type { Flashcard, FlashcardQuality, FlashcardReviewResult } from "../types/flashcard";
import type {
  CommunityOverview,
  CommunityFeed,
  CommunityPost,
  CommunityPostComment,
  CommunityPostsResponse,
  ExploreResourcePost,
  ReelHookMeta,
} from "../types/community";
import type {
  ReelChallengeResponse,
  ReelDailyProgress,
} from "../types/reel";
import type {
  ChapterThreadResponse,
  ThreadChallengeResponse,
  ThreadCommentListResponse,
  ThreadFeedPage,
  ThreadFollowResponse,
  ThreadLikeResponse,
  ThreadProfileResponse,
} from "../types/thread";
import { useModelStore } from "../store/modelStore";
import { useAiKeysStore } from "../store/aiKeysStore";
import {
  AI_MODEL_DEFAULT,
  getModelOption,
  isModelAllowed,
  type AiProvider,
} from "../lib/providers/modelRegistry";

function aiModelHeaders(overrideRef?: string): Record<string, string> {
  let selected =
    overrideRef && isModelAllowed(overrideRef)
      ? overrideRef
      : useModelStore.getState().selectedModel;
  const selectedModel = getModelOption(selected);
  if (!selectedModel || selectedModel.provider === "offline") {
    selected = AI_MODEL_DEFAULT;
  }
  const headers: Record<string, string> = {
    "x-ai-model": selected,
  };
  const model = getModelOption(selected);
  if (model) {
    const ownKey = useAiKeysStore.getState().keys[model.provider];
    if (ownKey) headers["x-ai-key"] = ownKey;
  }
  return headers;
}

function resolveDevServerBase(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  let host = hostUri.includes("://") ? hostUri.split("://")[1] : hostUri;
  host = host.split(":")[0].replace(/[\[\]]/g, "");
  if (!host) return null;

  if (
    Platform.OS === "android" &&
    (host === "localhost" || host === "127.0.0.1")
  ) {
    host = "10.0.2.2";
  }

  return `http://${host}:3001`;
}

export const API_BASE =
  resolveDevServerBase() || process.env.EXPO_PUBLIC_API_URL || "";

export type { Course };

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function mergeSignals(
  existing?: AbortSignal | null,
  timeout?: AbortSignal | null,
): AbortSignal | undefined {
  if (!timeout) return existing ?? undefined;
  if (!existing) return timeout ?? undefined;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  existing.addEventListener("abort", onAbort, { once: true });
  timeout.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

export function friendlyError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof TypeError && err.message === "Network request failed") {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { token, timeoutMs, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const signal = mergeSignals(
    fetchOptions.signal,
    timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  );

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers, signal });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body && typeof body.error === "string" && body.error
        ? body.error
        : `Request failed (${res.status})`;
    if (__DEV__) {
      console.warn(
        `[api] ${fetchOptions.method ?? "GET"} ${path} → ${res.status}${
          body?.code ? ` (${body.code})` : ""
        }${body?.requestId ? ` [req ${body.requestId}]` : ""}: ${message}`,
      );
    }
    throw new ApiError(message, res.status, body?.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface FetchJsonOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function fetchJson<T>(
  path: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { token, timeoutMs, ...fetchOptions } = options;
  return apiFetch<T>(path, {
    method: fetchOptions.method ?? "GET",
    body:
      fetchOptions.body === undefined
        ? undefined
        : JSON.stringify(fetchOptions.body),
    headers: fetchOptions.headers,
    token,
    timeoutMs,
  });
}

export type NotesChatMode = "note" | "web";

export interface NotesChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TutorChatStreamDone {
  type: "done";
  conversationId: string;
  message: TutorMessage | null;
  userMessageId?: string;
}

interface SseHandlers<TDone = void> {
  onDelta: (text: string) => void;
  onDone: (payload: TDone) => void;
  onError: (message: string) => void;
  onStep?: (step: AgentStep) => void;
}

async function readSse<TDone = void>(
  path: string,
  body: string,
  headers: Record<string, string>,
  handlers: SseHandlers<TDone>,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body,
    signal,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    throw new ApiError(payload?.error || `Request failed (${res.status})`, res.status, payload?.code);
  }

  const streamBody = res as unknown as {
    body?: { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }> } };
  };
  if (!streamBody.body?.getReader) {
    throw new Error("Streaming isn't supported on this device. Switch to Wait for full answer.");
  }

  const reader = streamBody.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  let errored = false;

  const processBlock = (block: string) => {
    const dataLine = block
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("data: "));
    if (!dataLine) return;
    try {
      const payload = JSON.parse(dataLine.slice(6)) as {
        type?: string;
        text?: string;
        message?: string;
        step?: AgentStep;
      };
      if (payload.type === "delta" && typeof payload.text === "string") {
        handlers.onDelta(payload.text);
      } else if (payload.type === "step" && payload.step) {
        handlers.onStep?.(payload.step);
      } else if (payload.type === "done") {
        finished = true;
        handlers.onDone(payload as TDone);
      } else if (payload.type === "error") {
        errored = true;
        handlers.onError(String(payload.message ?? "Stream failed."));
      }
    } catch {
      // ignore malformed chunk
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value ? decoder.decode(value, { stream: true }) : "";
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        processBlock(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
        sep = buffer.indexOf("\n\n");
      }
    }
  } finally {
    decoder.decode();
  }

  if (buffer.trim()) processBlock(buffer);
  if (!finished && !errored && !signal?.aborted) {
    handlers.onError("Connection closed before the answer finished. Try again.");
  }
}

export interface ApiUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  level?: string;
  majorCourse?: string;
  birthday?: string;
  educationLevel?: string;
  country?: string;
  region?: string;
  schoolType?: string;
  school?: string;
  grade?: string;
  degree?: string;
  subjects?: string[];
  professionalInfoEnabled?: boolean;
  status: "active" | "deleted";
  xp: number;
  coins: number;
  gamingLevel: number;
  rank: string;
  nextLevelXp: number;
  courses: Course[];
  earnedTrophies: string[];
  headline?: string;
  industry?: string;
  department?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  university?: string;
  linkedInUrl?: string;
  website?: string;
  bio?: string;
  collarType?: CollarType;
  availability?: Availability;
  skills?: string[];
  languages?: string[];
  interests?: string[];
  education?: Education[];
  workExperience?: WorkExperience[];
  tradeSkills?: string[];
  certifications?: Certification[];
  yearsOfTradeExperience?: number;
  lastCheckInDate?: string | null;
  currentStreak?: number;
  longestStreak?: number;
  learningGoals?: string[];
  onBoarded?: boolean;
  modelRatings?: Record<string, number>;
  isPro?: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export type ApiUserCreateInput = Partial<
  Omit<ApiUserProfile, "uid" | "createdAt" | "updatedAt" | "deletedAt">
> & {
  displayName: string;
  email: string;
  photoURL: string | null;
};

export const api = {
  users: {
    get: (uid: string, token: string) =>
      apiFetch<ApiUserProfile>(`/api/users/${uid}`, { token }),

    create: (
      uid: string,
      data: ApiUserCreateInput,
      token: string,
    ) =>
      apiFetch<ApiUserProfile>(`/api/users`, {
        method: "POST",
        body: JSON.stringify({ uid, ...data }),
        token,
      }),

    update: (uid: string, data: Record<string, unknown>, token: string) =>
      apiFetch<void>(`/api/users/${uid}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    search: (query: string, token: string) =>
      apiFetch<ApiUserProfile[]>(`/api/users/search?q=${encodeURIComponent(query)}`, { token }),

    checkIn: (uid: string, token: string) =>
      apiFetch<{
        alreadyCheckedIn: boolean;
        streak: number;
        longestStreak: number;
        xpReward: number;
        coinReward: number;
        xp?: number;
        coins?: number;
      }>(`/api/users/${uid}/checkin`, { method: "POST", token }),

    activity: {
      post: (
        uid: string,
        data: { date?: string; activityType: string; delta?: number },
        token: string,
      ) =>
        apiFetch<{ count: number }>(`/api/users/${uid}/activity`, {
          method: "POST",
          body: JSON.stringify(data),
          token,
        }),

      get: (uid: string, token: string, days = 90) =>
        apiFetch<{
          activity: { date: string; count: number }[];
          totalDays: number;
        }>(`/api/users/${uid}/activity?days=${days}`, { token }),
    },
  },

  levels: {
    getAll: (token: string) =>
      apiFetch<
        {
          id: string;
          levelNumber: number;
          xpRequired: number;
          rankName: string;
          coinReward: number;
        }[]
      >(`/api/levels`, { token }),
  },

  trophies: {
    getAll: (token: string) =>
      apiFetch<
        {
          id: string;
          name: string;
          description: string;
          icon: string;
          conditionType: string;
          conditionValue: number;
          coinReward: number;
        }[]
      >(`/api/trophies`, { token }),
  },

  bounties: {
    generate: (
      data: { courses: Record<string, unknown>[]; userId: string; dateSeed: string },
      token: string,
    ) =>
      apiFetch<{ bounties: Record<string, unknown>[]; source: string }>(
        `/api/bounties/generate`,
        {
          method: "POST",
          body: JSON.stringify(data),
          token,
          headers: aiModelHeaders(),
          timeoutMs: 45_000,
        },
      ),

    claim: (
      data: {
        userId: string;
        bounty: { id: string; title?: string; rewardXP?: number; rewardCoins?: number };
      },
      token: string,
    ) =>
      apiFetch<{ claimed: boolean; alreadyClaimed: boolean; date: string }>(
        `/api/bounties/claim`,
        { method: "POST", body: JSON.stringify(data), token },
      ),
  },

  courses: {
    getAll: (userId: string, token: string) =>
      apiFetch<Course[]>(`/api/courses?userId=${encodeURIComponent(userId)}`, { token }),

    getById: (id: string, token: string) =>
      apiFetch<Course>(`/api/courses/${id}`, { token }),

    generate: (data: GenerateCourseInput, token: string) =>
      apiFetch<GenerateCourseResponse>(`/api/courses/generate`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(),
        timeoutMs: 60_000,
      }),

    generateThumbnail: (courseId: string, prompt: string, token: string) =>
      apiFetch<{ thumbnailUrl: string }>(`/api/courses/${courseId}/thumbnail`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
        token,
      }),

    updateFlags: (
      id: string,
      data: {
        pinned?: boolean;
        favorite?: boolean;
        isPublic?: boolean;
        chapterPrivate?: { order: number; isPrivate: boolean };
      },
      token: string,
    ) =>
      apiFetch<Course>(`/api/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      apiFetch<void>(`/api/courses/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  lessons: {
    get: (
      courseId: string,
      chapterIndex: number,
      subtopicIndex: number,
      token: string,
    ) =>
      apiFetch<LessonScript>(
        `/api/courses/${encodeURIComponent(courseId)}/lessons/${chapterIndex}/${subtopicIndex}`,
        { token },
      ),

    generate: (
      courseId: string,
      chapterIndex: number,
      subtopicIndex: number,
      token: string,
    ) =>
      apiFetch<LessonScript>(
        `/api/courses/${encodeURIComponent(courseId)}/lessons/${chapterIndex}/${subtopicIndex}/generate`,
        {
          method: "POST",
          token,
          headers: aiModelHeaders(),
          timeoutMs: 90_000,
        },
      ),

    generateAudio: (lessonId: string, token: string) =>
      apiFetch<LessonScript>(
        `/api/lessons/${encodeURIComponent(lessonId)}/audio`,
        {
          method: "POST",
          token,
          timeoutMs: 180_000,
        },
      ),

    explain: (
      lessonId: string,
      slideId: string,
      action: LessonExplainAction,
      token: string,
    ) =>
      apiFetch<LessonExplainResponse>(
        `/api/lessons/${encodeURIComponent(lessonId)}/explain`,
        {
          method: "POST",
          body: JSON.stringify({ slideId, action }),
          token,
          headers: aiModelHeaders(),
          timeoutMs: 60_000,
        },
      ),
  },

  enrollments: {
    getAll: (userId: string, token: string) =>
      apiFetch<CourseEnrollment[]>(
        `/api/enrollments?userId=${encodeURIComponent(userId)}`,
        { token },
      ),

    create: (data: { userId: string; courseId: string }, token: string) =>
      apiFetch<CourseEnrollment>(`/api/enrollments`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: Record<string, unknown>, token: string) =>
      apiFetch<void>(`/api/enrollments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    remove: (id: string, token: string) =>
      apiFetch<void>(`/api/enrollments/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  userTrophies: {
    getAll: (userId: string, token: string) =>
      apiFetch<UserTrophy[]>(
        `/api/user-trophies?userId=${encodeURIComponent(userId)}`,
        { token },
      ),

    award: (data: { userId: string; trophyId: string }, token: string) =>
      apiFetch<UserTrophy>(`/api/user-trophies`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    check: (userId: string, token: string) =>
      apiFetch<{ awarded: UserTrophy[] }>(`/api/user-trophies/check`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        token,
      }),
  },

  community: {
    overview: (token: string) =>
      apiFetch<CommunityOverview>(`/api/community/overview`, { token }),

    feed: (
      token: string,
      limit = 20,
      includeMine = false,
      offset = 0,
      cursor?: string | null,
    ) =>
      apiFetch<CommunityFeed>(
        `/api/community/feed?limit=${limit}&includeMine=${includeMine ? "1" : "0"}&offset=${offset}${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
        }`,
        { token },
      ),

    challenge: (
      courseId: string,
      data: {
        chapterIndex: number;
        subtopicIndex: number;
        selectedIndex: number;
      },
      token: string,
    ) =>
      apiFetch<ReelChallengeResponse>(
        `/api/community/feed/${encodeURIComponent(courseId)}/challenge`,
        {
          method: "POST",
          body: JSON.stringify(data),
          token,
        },
      ),

    daily: (token: string) =>
      apiFetch<ReelDailyProgress>("/api/reels/daily", { token }),

    feedLike: (courseId: string, token: string) =>
      apiFetch<{ liked: boolean; likeCount: number }>(
        `/api/community/feed/${courseId}/like`,
        { method: "POST", token },
      ),

    trackView: (courseId: string, token: string) =>
      apiFetch<{ viewCount: number }>(
        `/api/community/feed/${courseId}/view`,
        { method: "POST", token },
      ),

    subtopicFeed: (
      token: string,
      params: { limit?: number; offset?: number; includeMine?: boolean; seed?: number } = {},
    ) => {
      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;
      const query = [`limit=${limit}`, `offset=${offset}`];
      if (params.includeMine) query.push("includeMine=1");
      if (params.seed) query.push(`seed=${params.seed}`);
      return apiFetch<ThreadFeedPage>(
        `/api/community/subtopic-feed?${query.join("&")}`,
        { token },
      );
    },

    chapterThread: (chapterId: string, token: string) =>
      apiFetch<ChapterThreadResponse>(
        `/api/community/chapters/${encodeURIComponent(chapterId)}/thread`,
        { token },
      ),

    threadProfile: (userId: string, token: string) =>
      apiFetch<ThreadProfileResponse>(
        `/api/community/users/${encodeURIComponent(userId)}/thread-profile`,
        { token },
      ),

    followUser: (userId: string, token: string) =>
      apiFetch<ThreadFollowResponse>(
        `/api/community/users/${encodeURIComponent(userId)}/follow`,
        { method: "POST", token },
      ),

    unfollowUser: (userId: string, token: string) =>
      apiFetch<ThreadFollowResponse>(
        `/api/community/users/${encodeURIComponent(userId)}/follow`,
        { method: "DELETE", token },
      ),

    challengeUser: (userId: string, token: string, postId?: string) =>
      apiFetch<ThreadChallengeResponse>(
        `/api/community/users/${encodeURIComponent(userId)}/challenge`,
        {
          method: "POST",
          body: JSON.stringify(postId ? { postId } : {}),
          token,
        },
      ),

    likeThreadPost: (postId: string, token: string) =>
      apiFetch<ThreadLikeResponse>(
        `/api/community/threads/${encodeURIComponent(postId)}/like`,
        { method: "POST", token },
      ),

    threadComments: (postId: string, token: string, limit = 50) =>
      apiFetch<ThreadCommentListResponse>(
        `/api/community/threads/${encodeURIComponent(postId)}/comments?limit=${limit}`,
        { token },
      ),

    addThreadComment: (postId: string, body: string, token: string) =>
      apiFetch<{ comment: ThreadCommentListResponse["comments"][number] }>(
        `/api/community/threads/${encodeURIComponent(postId)}/comments`,
        { method: "POST", body: JSON.stringify({ body }), token },
      ),

    posts: {
      list: (token: string, limit = 20) =>
        apiFetch<CommunityPostsResponse>(`/api/community/posts?limit=${limit}`, { token }),

      create: (
        data: { body: string; challengeType?: string | null },
        token: string,
      ) =>
        apiFetch<{ post: CommunityPost }>(`/api/community/posts`, {
          method: "POST",
          body: JSON.stringify(data),
          token,
        }),

      react: (postId: string, reaction: string, token: string) =>
        apiFetch<{ active: boolean; reaction?: string }>(
          `/api/community/posts/${postId}/reactions`,
          { method: "POST", body: JSON.stringify({ reaction }), token },
        ),

      comment: (postId: string, body: string, token: string) =>
        apiFetch<{ comment: CommunityPostComment }>(
          `/api/community/posts/${postId}/comments`,
          { method: "POST", body: JSON.stringify({ body }), token },
        ),
    },

    resources: {
      create: (
        data: {
          title: string;
          summary: string;
          hook: string;
          challengeType: string;
          challengePrompt: string;
          challengeOptions: string[];
          correctChoiceIndex?: number;
          revealText: string;
          shareCopy: string;
          resourceType: string;
          fileName: string;
          fileSizeBytes: number;
          mimeType: string;
          storageUrl: string;
          previewUrl?: string;
          previewText?: string;
          tags?: string[];
          difficulty?: string;
        },
        token: string,
      ) =>
        apiFetch<{ post: ExploreResourcePost }>('/api/community/resources', {
          method: 'POST',
          body: JSON.stringify(data),
          token,
        }),

      generateChallenge: (
        data: { title: string; summary: string; resourceType: string },
        token: string,
      ) =>
        apiFetch<ReelHookMeta>('/api/community/resources/challenge-preview', {
          method: 'POST',
          body: JSON.stringify(data),
          token,
          headers: aiModelHeaders(),
          timeoutMs: 30_000,
        }),
    },
  },

  subtopics: {
    generateQuiz: (data: GenerateQuizInput, token: string) =>
      apiFetch<GenerateQuizResponse>(`/api/subtopics/quiz`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(),
        timeoutMs: 30_000,
      }),
  },

  study: {
    process: (
      data: { fileUrl?: string; fileType: string; sourceType: string; title?: string; content?: string },
      token: string,
    ) =>
      apiFetch<StudyMaterial>(`/api/study/process`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(),
      }),

    getAll: (userId: string, token: string) =>
      apiFetch<StudyMaterial[]>(`/api/study/materials?userId=${encodeURIComponent(userId)}`, { token }),

    update: (id: string, data: Record<string, unknown>, token: string) =>
      apiFetch<void>(`/api/study/materials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      apiFetch<void>(`/api/study/materials/${id}`, {
        method: "DELETE",
        token,
      }),

    generateQuiz: (materialId: string, token: string) =>
      apiFetch<{ questions: StudyQuiz[] }>(`/api/study/${materialId}/quiz/generate`, {
        method: "POST",
        token,
        headers: aiModelHeaders(),
      }),

    generateCheatsheet: (materialId: string, token: string) =>
      apiFetch<{ cheatsheet: string }>(`/api/study/${materialId}/cheatsheet`, {
        method: "POST",
        token,
        headers: aiModelHeaders(),
      }),

    generateFlashcards: (materialId: string, token: string) =>
      apiFetch<{ flashcards: Flashcard[] }>(`/api/study/${materialId}/flashcards/generate`, {
        method: "POST",
        token,
        headers: aiModelHeaders(),
      }),

    suggest: (
      materialId: string,
      data: { biteTitle?: string; biteContent?: string },
      token: string,
    ) =>
      apiFetch<{ suggestions: StudySuggestion[] }>(`/api/study/${materialId}/suggest`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(),
      }),

    content: (materialId: string, token: string) =>
      apiFetch<{ title: string; content: string }>(
        `/api/study/${materialId}/content`,
        { token },
      ),

    completeQuiz: (
      materialId: string,
      data: { correct: number; total: number },
      token: string,
    ) =>
      apiFetch<{ scorePct: number; awardedXp: number; isFirstDailyAttempt: boolean }>(
        `/api/study/${materialId}/quiz/complete`,
        { method: "POST", body: JSON.stringify(data), token },
      ),

    getAttempts: (token: string) =>
      apiFetch<QuizAttempt[]>(`/api/study/attempts`, { token }),

    ragQuery: (
      data: { question: string; materialIds?: string[]; noteTexts?: { title: string; content: string }[] },
      getToken: () => Promise<string | null>,
    ) =>
      getToken().then((token) =>
        apiFetch<{ answer: string; citations: { quote: string; source: string }[] }>(`/api/study/rag-query`, {
          method: "POST",
          body: JSON.stringify(data),
          token: token ?? undefined,
          headers: aiModelHeaders(),
        }),
      ),
  },

  flashcards: {
    getAll: (token: string, dueOnly = false) =>
      apiFetch<Flashcard[]>(`/api/flashcards${dueOnly ? "?due=1" : ""}`, { token }),

    review: (id: string, quality: FlashcardQuality, token: string) =>
      apiFetch<FlashcardReviewResult>(`/api/flashcards/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ quality }),
        token,
      }),

    remove: (id: string, token: string) =>
      apiFetch<void>(`/api/flashcards/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  ai: {
    providers: (token: string) =>
      apiFetch<{
        providers: Partial<Record<AiProvider, { serverKeyConfigured: boolean }>>;
      }>(`/api/ai/providers`, { token }),

    ragContexts: (
      data: {
        question?: string;
        materialIds?: string[];
        noteId?: string;
        includeNotes?: boolean;
        noteTexts?: { title?: string; content: string }[];
      },
      token: string,
    ) =>
      apiFetch<{ contexts: { source: string; text: string }[] }>(
        `/api/ai/rag-contexts`,
        {
          method: "POST",
          body: JSON.stringify(data),
          token,
        },
      ),
  },

  audio: {
    transcribe: (
      data: { base64: string; mimeType: string },
      getToken: () => Promise<string | null>,
    ) =>
      getToken().then((token) =>
        apiFetch<{ transcript: string }>(`/api/audio/transcribe`, {
          method: "POST",
          body: JSON.stringify(data),
          token: token ?? undefined,
        }),
      ),
  },

  tutor: {
    conversations: {
      list: (token: string) =>
        apiFetch<{ conversations: TutorConversation[] }>(
          `/api/tutor/conversations`,
          { token },
        ),

      create: (
        data: { title?: string; persona?: TutorPersona; mode?: TutorMode },
        token: string,
      ) =>
        apiFetch<{ conversation: TutorConversation }>(
          `/api/tutor/conversations`,
          {
            method: "POST",
            body: JSON.stringify(data),
            token,
          },
        ),

      get: (id: string, token: string) =>
        apiFetch<{
          conversation: TutorConversation;
          messages: TutorMessage[];
        }>(`/api/tutor/conversations/${id}`, { token }),

      remove: (id: string, token: string) =>
        apiFetch<void>(`/api/tutor/conversations/${id}`, {
          method: "DELETE",
          token,
        }),
    },

    preferences: {
      get: (token: string) =>
        apiFetch<{ preferences: TutorPreferences }>(
          `/api/tutor/preferences`,
          { token },
        ),

      update: (data: Partial<TutorPreferences>, token: string) =>
        apiFetch<{ preferences: TutorPreferences }>(
          `/api/tutor/preferences`,
          {
            method: "PUT",
            body: JSON.stringify(data),
            token,
          },
        ),
    },

    chat: (
      data: TutorChatInput,
      token: string,
      opts?: { modelRef?: string },
    ) =>
      apiFetch<TutorChatResponse>(`/api/tutor/chat`, {
        method: "POST",
        body: JSON.stringify({ ...data, stream: false }),
        token,
        headers: aiModelHeaders(opts?.modelRef),
        timeoutMs: 60_000,
      }),

    chatStream: (
      data: Omit<TutorChatInput, "stream">,
      token: string,
      handlers: SseHandlers<TutorChatStreamDone>,
      opts?: { modelRef?: string; signal?: AbortSignal },
    ) =>
      readSse(
        `/api/tutor/chat`,
        JSON.stringify({ ...data, stream: true }),
        {
          "Content-Type": "application/json",
          ...aiModelHeaders(opts?.modelRef),
          Authorization: `Bearer ${token}`,
        },
        handlers,
        opts?.signal,
      ),

    plan: (
      data: {
        examType?: string;
        examDate: string;
        subjects: string[];
        daysPerWeek: number;
        minutesPerDay: number;
        timezone?: string;
      },
      token: string,
    ) =>
      apiFetch<{ plan: TutorPlan }>(`/api/tutor/plan`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    quiz: (
      data: TutorQuizInput,
      token: string,
      opts?: { modelRef?: string },
    ) =>
      apiFetch<{ quiz: TutorQuiz }>(`/api/tutor/quiz`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(opts?.modelRef),
        timeoutMs: 60_000,
      }),
  },

  agent: {
    chat: (
      data: Omit<AgentChatInput, "stream">,
      token: string,
      opts?: { modelRef?: string },
    ) =>
      apiFetch<AgentChatResponse>(`/api/agent/chat`, {
        method: "POST",
        body: JSON.stringify({ ...data, stream: false }),
        token,
        headers: aiModelHeaders(opts?.modelRef),
        timeoutMs: 90_000,
      }),

    chatStream: (
      data: Omit<AgentChatInput, "stream">,
      token: string,
      handlers: SseHandlers<AgentChatStreamDone>,
      opts?: { modelRef?: string; signal?: AbortSignal },
    ) =>
      readSse(
        `/api/agent/chat`,
        JSON.stringify({ ...data, stream: true }),
        {
          "Content-Type": "application/json",
          ...aiModelHeaders(opts?.modelRef),
          Authorization: `Bearer ${token}`,
        },
        handlers,
        opts?.signal,
      ),

    actions: {
      list: (token: string) =>
        apiFetch<{ actions: AgentPendingAction[] }>("/api/agent/actions", {
          token,
        }),

      approve: (
        id: string,
        result: { ok: boolean; summary?: string; error?: string } | undefined,
        token: string,
      ) =>
        apiFetch<AgentActionResult>(
          `/api/agent/actions/${encodeURIComponent(id)}/approve`,
          {
            method: "POST",
            body: JSON.stringify({ result }),
            token,
          },
        ),

      reject: (id: string, token: string) =>
        apiFetch<AgentActionResult>(
          `/api/agent/actions/${encodeURIComponent(id)}/reject`,
          {
            method: "POST",
            token,
          },
        ),
    },

    memories: {
      list: (token: string) =>
        apiFetch<{ memories: AgentMemoryRecord[] }>("/api/agent/memories", {
          token,
        }),

      create: (data: AgentMemoryInput, token: string) =>
        apiFetch<{ memory: AgentMemoryRecord }>("/api/agent/memories", {
          method: "POST",
          body: JSON.stringify(data),
          token,
        }),

      update: (id: string, data: AgentMemoryUpdateInput, token: string) =>
        apiFetch<{ memory: AgentMemoryRecord }>(
          `/api/agent/memories/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
            token,
          },
        ),

      upload: (data: AgentMemoryUploadInput, token: string) =>
        apiFetch<{ memory: AgentMemoryRecord; extractionFailed: boolean }>(
          "/api/agent/memories/upload",
          {
            method: "POST",
            body: JSON.stringify(data),
            token,
            timeoutMs: 180_000,
          },
        ),

      remove: (id: string, token: string) =>
        apiFetch<{ deleted: boolean }>(
          `/api/agent/memories/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            token,
          },
        ),
    },

    profiles: {
      list: (token: string) =>
        apiFetch<{ profiles: AgentProfile[] }>("/api/agent/profiles", {
          token,
        }),

      create: (data: AgentProfileInput, token: string) =>
        apiFetch<{ profile: AgentProfile }>("/api/agent/profiles", {
          method: "POST",
          body: JSON.stringify(data),
          token,
        }),

      update: (id: string, data: Partial<AgentProfileInput>, token: string) =>
        apiFetch<{ profile: AgentProfile }>(
          `/api/agent/profiles/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
            token,
          },
        ),

      setDefault: (id: string, token: string) =>
        apiFetch<{ profile: AgentProfile }>(
          `/api/agent/profiles/${encodeURIComponent(id)}/default`,
          {
            method: "POST",
            token,
          },
        ),

      remove: (id: string, token: string) =>
        apiFetch<{ deleted: boolean }>(
          `/api/agent/profiles/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            token,
          },
        ),
    },

    integrations: {
      list: (token: string) =>
        apiFetch<AgentIntegrationsResponse>("/api/agent/integrations", {
          token,
        }),

      connect: (toolkit: string, token: string) =>
        apiFetch<AgentIntegrationConnectResponse>(
          `/api/agent/integrations/${encodeURIComponent(toolkit)}/connect`,
          {
            method: "POST",
            token,
            timeoutMs: 30_000,
          },
        ),

      sync: (toolkit: string, token: string) =>
        apiFetch<{ toolkit: AgentIntegrationsResponse["toolkits"][number] }>(
          `/api/agent/integrations/${encodeURIComponent(toolkit)}/sync`,
          {
            method: "POST",
            token,
            timeoutMs: 30_000,
          },
        ),

      disconnect: (toolkit: string, token: string) =>
        apiFetch<{ toolkit: AgentIntegrationsResponse["toolkits"][number] }>(
          `/api/agent/integrations/${encodeURIComponent(toolkit)}`,
          {
            method: "DELETE",
            token,
            timeoutMs: 30_000,
          },
        ),
    },

    routines: {
      list: (token: string) =>
        apiFetch<{ routines: AgentRoutine[] }>("/api/agent/routines", {
          token,
        }),

      create: (data: AgentRoutineInput, token: string) =>
        apiFetch<{ routine: AgentRoutine }>("/api/agent/routines", {
          method: "POST",
          body: JSON.stringify(data),
          token,
        }),

      update: (id: string, data: Partial<AgentRoutineInput>, token: string) =>
        apiFetch<{ routine: AgentRoutine }>(
          `/api/agent/routines/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
            token,
          },
        ),

      toggle: (id: string, enabled: boolean, token: string) =>
        apiFetch<{ routine: AgentRoutine }>(
          `/api/agent/routines/${encodeURIComponent(id)}/toggle`,
          {
            method: "POST",
            body: JSON.stringify({ enabled }),
            token,
          },
        ),

      run: (id: string, token: string) =>
        apiFetch<{ run: AgentRoutineRun }>(
          `/api/agent/routines/${encodeURIComponent(id)}/run`,
          {
            method: "POST",
            token,
            timeoutMs: 120_000,
          },
        ),

      runs: (id: string, token: string) =>
        apiFetch<{ runs: AgentRoutineRun[] }>(
          `/api/agent/routines/${encodeURIComponent(id)}/runs`,
          {
            token,
          },
        ),

      remove: (id: string, token: string) =>
        apiFetch<{ deleted: boolean }>(
          `/api/agent/routines/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            token,
          },
        ),
    },

    history: (token: string, opts?: { kind?: "tool" | "routine"; limit?: number }) => {
      const params = new URLSearchParams();
      if (opts?.kind) params.set("kind", opts.kind);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return apiFetch<{ executions: AgentExecutionRecord[] }>(
        `/api/agent/history${qs ? `?${qs}` : ""}`,
        { token },
      );
    },
  },

  notes: {
    ai: (
      data: Record<string, unknown>,
      token: string,
      opts?: { modelRef?: string },
    ) =>
      apiFetch<Record<string, unknown>>(`/api/notes/ai`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(opts?.modelRef),
      }),

    chat: (
      data: {
        mode: NotesChatMode;
        reasoning: boolean;
        noteId: string;
        noteTitle: string;
        noteContent: string;
        messages: NotesChatTurn[];
        images?: AiImagesArg[];
      },
      token: string,
      opts?: { modelRef?: string },
    ) =>
      apiFetch<{ answer: string; mode: NotesChatMode; model: string }>(`/api/notes/ai/chat`, {
        method: "POST",
        body: JSON.stringify({ ...data, stream: false }),
        token,
        headers: aiModelHeaders(opts?.modelRef),
      }),

    chatStream: (
      data: {
        mode: NotesChatMode;
        reasoning: boolean;
        noteId: string;
        noteTitle: string;
        noteContent: string;
        messages: NotesChatTurn[];
        images?: AiImagesArg[];
      },
      token: string,
      handlers: SseHandlers,
      opts?: { modelRef?: string; signal?: AbortSignal },
    ) =>
      readSse(
        `/api/notes/ai/chat`,
        JSON.stringify({ ...data, stream: true }),
        {
          "Content-Type": "application/json",
          ...aiModelHeaders(opts?.modelRef),
          Authorization: `Bearer ${token}`,
        },
        handlers,
        opts?.signal,
      ),

    index: (data: { noteId: string; title: string; content: string }, token: string) =>
      apiFetch<void>(`/api/notes/index`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),

    unindex: (noteId: string, token: string) =>
      apiFetch<void>(`/api/notes/index/${noteId}`, {
        method: "DELETE",
        token,
      }),

    chats: {
      list: (noteId: string, token: string) =>
        apiFetch<NoteChatMessage[]>(`/api/notes/${noteId}/chats`, {
          method: "GET",
          token,
        }),

      save: (noteId: string, messages: NoteChatMessageInput[], token: string) =>
        apiFetch<void>(`/api/notes/${noteId}/chats`, {
          method: "POST",
          body: JSON.stringify({ messages }),
          token,
        }),

      clear: (noteId: string, token: string) =>
        apiFetch<void>(`/api/notes/${noteId}/chats`, {
          method: "DELETE",
          token,
        }),
    },
  },

  schedule: {
    suggest: (
      data: {
        date: string;
        tasks: { id: string; title: string; time?: string; done: boolean }[];
      },
      token: string,
      opts?: { modelRef?: string },
    ) =>
      apiFetch<{ suggestions: { id: string; reason: string }[] }>(
        `/api/schedule/suggest`,
        {
          method: "POST",
          body: JSON.stringify(data),
          token,
          headers: aiModelHeaders(opts?.modelRef),
        },
      ),
  },
};

export interface NoteChatMessage {
  id: string;
  role: "user" | "assistant";
  kind: "chat" | "summary" | "tags" | "cheatsheet" | "flashcards" | "quiz";
  content: string;
  createdAt: string;
}

export interface AiImagesArg {
  order: number;
  base64: string;
  mimeType: string;
}

export type NoteChatMessageInput = Pick<NoteChatMessage, "id" | "role" | "kind" | "content"> &
  Partial<Pick<NoteChatMessage, "createdAt">>;