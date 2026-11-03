import { create } from "zustand";
import { api } from "../lib/api";
import type {
  ReelChallengeAttempt,
  ReelDailyProgress,
} from "../types/reel";
import { useUserStore } from "./userStore";

interface ReelState {
  daily: ReelDailyProgress | null;
  dailyLoading: boolean;
  attempts: Record<string, ReelChallengeAttempt>;
  loadDaily: (token: string) => Promise<void>;
  submitChallenge: (
    token: string,
    itemKey: string,
    courseId: string,
    chapterIndex: number,
    subtopicIndex: number,
    selectedIndex: number,
  ) => Promise<ReelChallengeAttempt | null>;
}

export const useReelStore = create<ReelState>((set, get) => ({
  daily: null,
  dailyLoading: false,
  attempts: {},

  loadDaily: async (token) => {
    set({ dailyLoading: true });
    try {
      const daily = await api.community.daily(token);
      set({ daily });
    } catch (err) {
      console.error("[ReelStore] daily load failed:", err);
    } finally {
      set({ dailyLoading: false });
    }
  },

  submitChallenge: async (
    token,
    itemKey,
    courseId,
    chapterIndex,
    subtopicIndex,
    selectedIndex,
  ) => {
    try {
      const response = await api.community.challenge(
        courseId,
        { chapterIndex, subtopicIndex, selectedIndex },
        token,
      );
      set((state) => ({
        daily: response.daily,
        attempts: { ...state.attempts, [itemKey]: response.attempt },
      }));

      const profile = useUserStore.getState().profile;
      if (profile && response.attempt.xpAwarded + response.attempt.bonusXp > 0) {
        await useUserStore.getState().refreshProfile(profile.uid, token);
      }
      return response.attempt;
    } catch (err) {
      console.error("[ReelStore] challenge submit failed:", err);
      return null;
    }
  },
}));
