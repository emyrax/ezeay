import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { api, friendlyError } from "../lib/api";
import { eventBus } from "../lib/eventBus";
import { focusItemFromPost } from "../lib/focus/selectors";
import type { FocusSubtopic, QuizQuestion, ThreadQuizSession } from "../types/learning";
import type { ThreadPost } from "../types/thread";

const STORAGE_KEY = "@yuinx_thread_learning_v1";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface PersistedState {
  focus: Record<string, FocusSubtopic>;
  completedLessons: Record<string, string>;
  quizSessions: Record<string, ThreadQuizSession>;
}

interface ThreadLearningState extends PersistedState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFocus: (post: ThreadPost) => void;
  isFocused: (postId: string) => boolean;
  markLessonCompleted: (postId: string) => void;
  generateQuiz: (
    post: ThreadPost,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  resetQuiz: (postId: string) => void;
}

function emptySession(): ThreadQuizSession {
  return {
    status: "idle",
    questions: [],
    attempted: false,
    lastScore: null,
    generatedAt: null,
    error: null,
  };
}

function isFresh(session: ThreadQuizSession, now: number): boolean {
  if (!session.generatedAt) return true;
  const generatedAt = new Date(session.generatedAt).getTime();
  return !Number.isNaN(generatedAt) && now - generatedAt < SESSION_TTL_MS;
}

function normalizeSession(session: ThreadQuizSession, now: number): ThreadQuizSession {
  if (!isFresh(session, now)) return emptySession();
  if (session.status === "generating") {
    return {
      ...session,
      status: session.questions.length > 0 ? "ready" : "idle",
    };
  }
  return session;
}

async function persist(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        focus: state.focus,
        completedLessons: state.completedLessons,
        quizSessions: state.quizSessions,
      }),
    );
  } catch (err) {
    console.error("[ThreadLearningStore] persist failed:", err);
  }
}

function toQuizQuestions(
  questions: { id: string; question: string; options: string[]; correctAnswer: number; explanation: string }[],
): QuizQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options,
    correctAnswerIndex: question.correctAnswer,
    explanation: question.explanation,
  }));
}

export const useThreadLearningStore = create<ThreadLearningState>((set, get) => ({
  focus: {},
  completedLessons: {},
  quizSessions: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(stored) as Partial<PersistedState>;
      const now = Date.now();
      const quizSessions: Record<string, ThreadQuizSession> = {};
      for (const [postId, session] of Object.entries(parsed.quizSessions ?? {})) {
        quizSessions[postId] = normalizeSession(session, now);
      }
      set({
        focus: parsed.focus ?? {},
        completedLessons: parsed.completedLessons ?? {},
        quizSessions,
        hydrated: true,
      });
    } catch (err) {
      console.error("[ThreadLearningStore] hydrate failed:", err);
      set({ hydrated: true });
    }
  },

  toggleFocus: (post) => {
    const focus = { ...get().focus };
    if (focus[post.id]) {
      delete focus[post.id];
    } else {
      focus[post.id] = focusItemFromPost(post);
      eventBus.emit("toast:success", { title: "Added to focus" });
    }
    set({ focus });
    void persist({ ...get(), focus });
  },

  isFocused: (postId) => !!get().focus[postId],

  markLessonCompleted: (postId) => {
    const completedLessons = {
      ...get().completedLessons,
      [postId]: new Date().toISOString(),
    };
    set({ completedLessons });
    void persist({ ...get(), completedLessons });
  },

  generateQuiz: async (post, getToken) => {
    const current = get().quizSessions[post.id];
    if (current?.status === "generating") return;
    if (current && current.questions.length > 0) {
      set((state) => ({
        quizSessions: {
          ...state.quizSessions,
          [post.id]: { ...current, status: "ready" },
        },
      }));
      return;
    }

    if (!post.subtopicDetails.trim()) {
      eventBus.emit("toast:error", { title: "This subtopic has no quiz content yet." });
      return;
    }

    set((state) => ({
      quizSessions: {
        ...state.quizSessions,
        [post.id]: { ...emptySession(), status: "generating" },
      },
    }));

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to generate a quiz.");
      const response = await api.subtopics.generateQuiz(
        {
          courseId: post.courseId,
          courseTitle: post.courseTitle,
          chapterIndex: post.chapterIndex,
          subtopicIndex: post.subtopicIndex,
          subtopicTitle: post.subtopicTitle,
          subtopicDetails: post.subtopicDetails,
        },
        token,
      );
      const quizSessions = {
        ...get().quizSessions,
        [post.id]: {
          ...emptySession(),
          status: "ready" as const,
          questions: toQuizQuestions(response.quiz.questions),
          generatedAt: new Date().toISOString(),
        },
      };
      set({ quizSessions });
      void persist({ ...get(), quizSessions });
    } catch (err) {
      const message = friendlyError(err, "Quiz generation failed. Please try again.");
      const quizSessions = {
        ...get().quizSessions,
        [post.id]: {
          ...emptySession(),
          error: message,
        },
      };
      set({ quizSessions });
      void persist({ ...get(), quizSessions });
      eventBus.emit("toast:error", { title: message });
    }
  },

  resetQuiz: (postId) => {
    const quizSessions = { ...get().quizSessions };
    delete quizSessions[postId];
    set({ quizSessions });
    void persist({ ...get(), quizSessions });
  },
}));
