import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRESS_STORAGE_KEY = "@yuinx_course_progress_v1";

export interface ChapterPerformance {
  tier: "perfect" | "great" | "good" | "average" | "low";
  emoji: string;
  message: string;
  subtitle: string;
  xp: number;
  stats: {
    totalRetries: number;
    avgScore: number;
    perfectCount: number;
  };
}

interface ProgressState {
  completedSubtopics: Record<string, boolean>;
  passedQuizzes: Record<string, boolean>;
  quizAttempts: Record<string, number>;
  quizScores: Record<string, number>;
  loaded: boolean;
  error: string | null;
  loadProgress: () => Promise<void>;
  batchMarkCompleted: (courseId: string, chapterIndex: number, subtopicIndex: number) => Promise<void>;
  isQuizPassed: (courseId: string, chapterIndex: number, subtopicIndex: number) => boolean;
  isSubtopicUnlocked: (courseId: string, chapterIndex: number, subtopicIndex: number) => boolean;
  getCompletionPercent: (courseId: string, totalSubtopics: number) => number;
  getCompletedSubtopicCount: (courseId: string, chapterIndex: number) => number;
  recordQuizAttempt: (courseId: string, chapterIndex: number, subtopicIndex: number) => Promise<void>;
  recordQuizScore: (courseId: string, chapterIndex: number, subtopicIndex: number, score: number) => Promise<void>;
  getChapterPerformance: (courseId: string, chapterIndex: number, subtopicCount: number) => ChapterPerformance;
  getProgressDetails: (courseId: string) => string;
  loadProgressFromDetails: (courseId: string, details: string) => void;
  clearProgress: () => Promise<void>;
  reset: () => void;
}

function subtopicKey(courseId: string, ch: number, sub: number): string {
  return `${courseId}_${ch}_${sub}`;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  completedSubtopics: {},
  passedQuizzes: {},
  quizAttempts: {},
  quizScores: {},
  loaded: false,
  error: null,

  reset: () =>
    set({
      completedSubtopics: {},
      passedQuizzes: {},
      quizAttempts: {},
      quizScores: {},
      loaded: false,
      error: null,
    }),

  loadProgress: async () => {
    try {
      const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          completedSubtopics: parsed.completedSubtopics ?? {},
          passedQuizzes: parsed.passedQuizzes ?? {},
          quizAttempts: parsed.quizAttempts ?? {},
          quizScores: parsed.quizScores ?? {},
          loaded: true,
          error: null,
        });
      } else {
        set({ loaded: true, error: null });
      }
    } catch (err) {
      console.error("[ProgressStore] loadProgress failed:", err);
      set({ loaded: true, error: "Failed to load progress." });
    }
  },

  isQuizPassed: (courseId, chapterIndex, subtopicIndex) => {
    return !!get().passedQuizzes[subtopicKey(courseId, chapterIndex, subtopicIndex)];
  },

  getCompletedSubtopicCount: (courseId, chapterIndex) => {
    return Object.keys(get().passedQuizzes).filter((k) =>
      k.startsWith(`${courseId}_${chapterIndex}_`),
    ).length;
  },

  isSubtopicUnlocked: (courseId, chapterIndex, subtopicIndex) => {
    if (chapterIndex === 0 && subtopicIndex === 0) return true;
    if (subtopicIndex > 0) {
      return !!get().passedQuizzes[subtopicKey(courseId, chapterIndex, subtopicIndex - 1)];
    }
    if (chapterIndex > 0) {
      const prevChapterSubtopics = 4;
      return !!get().passedQuizzes[subtopicKey(courseId, chapterIndex - 1, prevChapterSubtopics - 1)];
    }
    return false;
  },

  getCompletionPercent: (courseId, totalSubtopics) => {
    const passed = Object.keys(get().passedQuizzes).filter((k) =>
      k.startsWith(courseId),
    ).length;
    return totalSubtopics > 0 ? Math.round((passed / totalSubtopics) * 100) : 0;
  },

  batchMarkCompleted: async (courseId, chapterIndex, subtopicIndex) => {
    const key = subtopicKey(courseId, chapterIndex, subtopicIndex);
    const state = get();
    const newPassed = { ...state.passedQuizzes, [key]: true };
    const newCompleted = { ...state.completedSubtopics, [key]: true };
    set({ passedQuizzes: newPassed, completedSubtopics: newCompleted });
    await persistAll(newCompleted, newPassed, state.quizAttempts, state.quizScores);
  },

  recordQuizAttempt: async (courseId, chapterIndex, subtopicIndex) => {
    const key = subtopicKey(courseId, chapterIndex, subtopicIndex);
    const state = get();
    const newAttempts = { ...state.quizAttempts, [key]: (state.quizAttempts[key] ?? 0) + 1 };
    set({ quizAttempts: newAttempts });
    await persistAll(state.completedSubtopics, state.passedQuizzes, newAttempts, state.quizScores);
  },

  recordQuizScore: async (courseId, chapterIndex, subtopicIndex, score) => {
    const key = subtopicKey(courseId, chapterIndex, subtopicIndex);
    const state = get();
    const current = state.quizScores[key] ?? 0;
    if (score > current) {
      const newScores = { ...state.quizScores, [key]: score };
      set({ quizScores: newScores });
      await persistAll(state.completedSubtopics, state.passedQuizzes, state.quizAttempts, newScores);
    }
  },

  getChapterPerformance: (courseId, chapterIndex, subtopicCount) => {
    const state = get();
    let totalRetries = 0;
    let totalScore = 0;
    let perfectCount = 0;
    let scoredCount = 0;

    for (let i = 0; i < subtopicCount; i++) {
      const key = subtopicKey(courseId, chapterIndex, i);
      const attempts = state.quizAttempts[key] ?? 0;
      const score = state.quizScores[key] ?? 0;
      if (attempts > 0) {
        totalRetries += attempts - 1;
        totalScore += score;
        scoredCount++;
        if (attempts === 1 && score === 100) perfectCount++;
      }
    }

    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    if (totalRetries === 0 && avgScore === 100 && scoredCount === subtopicCount) {
      return {
        tier: "perfect", emoji: "🏆", message: "Bravo!",
        subtitle: "Flawless — all first try!",
        xp: 6,
        stats: { totalRetries, avgScore, perfectCount },
      };
    }
    if (avgScore >= 85) {
      return {
        tier: "great", emoji: "🌟", message: "Impressive!",
        subtitle: "Almost perfect, keep pushing!",
        xp: 5,
        stats: { totalRetries, avgScore, perfectCount },
      };
    }
    if (avgScore >= 70) {
      return {
        tier: "good", emoji: "👍", message: "Well done!",
        subtitle: "Solid effort, room to grow!",
        xp: 4,
        stats: { totalRetries, avgScore, perfectCount },
      };
    }
    if (avgScore >= 50) {
      return {
        tier: "average", emoji: "💪", message: "Not bad!",
        subtitle: "Review the tough spots and try again!",
        xp: 3,
        stats: { totalRetries, avgScore, perfectCount },
      };
    }
    return {
      tier: "low", emoji: "📚", message: "Better luck next time!",
      subtitle: "Review the material and give it another shot.",
      xp: 2,
      stats: { totalRetries, avgScore, perfectCount },
    };
  },

  getProgressDetails: (courseId) => {
    const state = get();
    const passed: Record<string, boolean> = {};
    const completed: Record<string, boolean> = {};
    const attempts: Record<string, number> = {};
    const scores: Record<string, number> = {};
    for (const k of Object.keys(state.passedQuizzes)) {
      if (k.startsWith(courseId)) passed[k] = true;
    }
    for (const k of Object.keys(state.completedSubtopics)) {
      if (k.startsWith(courseId)) completed[k] = true;
    }
    for (const k of Object.keys(state.quizAttempts)) {
      if (k.startsWith(courseId)) attempts[k] = state.quizAttempts[k];
    }
    for (const k of Object.keys(state.quizScores)) {
      if (k.startsWith(courseId)) scores[k] = state.quizScores[k];
    }
    return JSON.stringify({ passedQuizzes: passed, completedSubtopics: completed, quizAttempts: attempts, quizScores: scores });
  },

  loadProgressFromDetails: (courseId, details) => {
    try {
      const parsed = JSON.parse(details);
      const state = get();
      const mergedPassed = { ...state.passedQuizzes };
      const mergedCompleted = { ...state.completedSubtopics };
      const mergedAttempts = { ...state.quizAttempts };
      const mergedScores = { ...state.quizScores };
      for (const k of Object.keys(parsed.passedQuizzes ?? {})) mergedPassed[k] = true;
      for (const k of Object.keys(parsed.completedSubtopics ?? {})) mergedCompleted[k] = true;
      for (const k of Object.keys(parsed.quizAttempts ?? {})) mergedAttempts[k] = parsed.quizAttempts[k];
      for (const k of Object.keys(parsed.quizScores ?? {})) {
        const v = parsed.quizScores[k];
        if (v > (mergedScores[k] ?? 0)) mergedScores[k] = v;
      }
      set({ passedQuizzes: mergedPassed, completedSubtopics: mergedCompleted, quizAttempts: mergedAttempts, quizScores: mergedScores });
    } catch (err) {
      console.error("[ProgressStore] loadProgressFromDetails failed:", err);
    }
  },

  clearProgress: async () => {
    set({ completedSubtopics: {}, passedQuizzes: {}, quizAttempts: {}, quizScores: {}, error: null });
    try {
      await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
    } catch (err) {
      console.error("[ProgressStore] clearProgress failed:", err);
      set({ error: "Failed to clear progress." });
    }
  },
}));

async function persistAll(
  completedSubtopics: Record<string, boolean>,
  passedQuizzes: Record<string, boolean>,
  quizAttempts: Record<string, number>,
  quizScores: Record<string, number>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ completedSubtopics, passedQuizzes, quizAttempts, quizScores }),
    );
  } catch (err) {
    console.error("[ProgressStore] persist failed:", err);
  }
}
