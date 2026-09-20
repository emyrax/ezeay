import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Course } from "../types/course";
import type { CourseEnrollment } from "../types/courseEnrollment";
import type { UserTrophy } from "../types/userTrophy";
import type {
  GenerateCourseInput,
  GenerateCourseResponse,
  GenerateQuizInput,
  GenerateQuizResponse,
} from "../types/courseGeneration";
import type { CollarType, Availability, Education, WorkExperience, Certification } from "../types/user";
import type { StudyMaterial, StudyQuiz, QuizAttempt } from "../types/study";
import type { Flashcard, FlashcardQuality, FlashcardReviewResult } from "../types/flashcard";
import type { CommunityOverview, CommunityFeed, CommunityPost, CommunityPostComment, CommunityPostsResponse } from "../types/community";
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
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body && typeof body.error === "string" && body.error
        ? body.error
        : `Request failed (${res.status})`;
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
}

export async function fetchJson<T>(
  path: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;
  return apiFetch<T>(path, {
    method: fetchOptions.method ?? "GET",
    body:
      fetchOptions.body === undefined
        ? undefined
        : JSON.stringify(fetchOptions.body),
    headers: fetchOptions.headers,
    token,
  });
}

export type NotesChatMode = "note" | "web";

export interface NotesChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface SseHandlers {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

async function readSse(
  path: string,
  body: string,
  headers: Record<string, string>,
  handlers: SseHandlers,
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
      };
      if (payload.type === "delta" && typeof payload.text === "string") {
        handlers.onDelta(payload.text);
      } else if (payload.type === "done") {
        finished = true;
        handlers.onDone();
      } else if (payload.type === "error") {
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
  if (!finished && !signal?.aborted) {
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
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export const api = {
  users: {
    get: (uid: string, token: string) =>
      apiFetch<ApiUserProfile>(`/api/users/${uid}`, { token }),

    create: (
      uid: string,
      data: {
        displayName: string;
        email: string;
        photoURL: string | null;
      },
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
        { method: "POST", body: JSON.stringify(data), token, headers: aiModelHeaders() },
      ),

    claim: (
      data: { userId: string; bountyId: string; claimedAt?: string },
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
      }),

    generateThumbnail: (courseId: string, prompt: string, token: string) =>
      apiFetch<{ thumbnailUrl: string }>(`/api/courses/${courseId}/thumbnail`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
        token,
      }),

    updateFlags: (
      id: string,
      data: { pinned?: boolean; favorite?: boolean; isPublic?: boolean },
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

    feed: (token: string, limit = 20) =>
      apiFetch<CommunityFeed>(`/api/community/feed?limit=${limit}`, { token }),

    feedLike: (courseId: string, token: string) =>
      apiFetch<{ liked: boolean; likeCount: number }>(
        `/api/community/feed/${courseId}/like`,
        { method: "POST", token },
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
  },

  subtopics: {
    generateQuiz: (data: GenerateQuizInput, token: string) =>
      apiFetch<GenerateQuizResponse>(`/api/subtopics/quiz`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
        headers: aiModelHeaders(),
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