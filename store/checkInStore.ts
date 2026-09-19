import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import { getLevelProgress } from "../services/LevelService";
import { useStatsStore } from "./statsStore";
import { useUserStore } from "./userStore";
import { useUserTrophyStore } from "./userTrophyStore";

const STORAGE_KEY = "@yuinx_checkin_v1";

interface CheckInState {
  lastCheckInDate: string | null;
  currentStreak: number;
  longestStreak: number;
  loaded: boolean;
  pending: boolean;
}

interface CheckInStore extends CheckInState {
  load: (uid: string, getToken: () => Promise<string | null>) => Promise<void>;
  checkIn: (uid: string, getToken: () => Promise<string | null>) => Promise<{
    success: boolean;
    streak: number;
    xpReward: number;
    coinReward: number;
  }>;
  canCheckIn: () => boolean;
}

function persistState(state: Pick<CheckInState, "lastCheckInDate" | "currentStreak" | "longestStreak" | "pending">) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export const useCheckInStore = create<CheckInStore>((set, get) => ({
  lastCheckInDate: null,
  currentStreak: 0,
  longestStreak: 0,
  loaded: false,
  pending: false,

  load: async (uid, getToken) => {
    const token = await getToken();

    if (token) {
      try {
        if (get().pending) {
          const replay = await api.users.checkIn(uid, token);
          set({
            lastCheckInDate: new Date().toISOString().slice(0, 10),
            currentStreak: replay.streak,
            longestStreak: replay.longestStreak,
            pending: false,
          });
          persistState({
            lastCheckInDate: new Date().toISOString().slice(0, 10),
            currentStreak: replay.streak,
            longestStreak: replay.longestStreak,
            pending: false,
          });
        }

        const profile = await api.users.get(uid, token);
        set({
          lastCheckInDate: profile.lastCheckInDate ?? null,
          currentStreak: profile.currentStreak ?? 0,
          longestStreak: profile.longestStreak ?? 0,
          loaded: true,
          pending: false,
        });
        return;
      } catch {}
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CheckInState;
        set({ ...parsed, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  checkIn: async (uid, getToken) => {
    const today = new Date().toISOString().slice(0, 10);
    const s = get();
    if (s.lastCheckInDate === today) {
      return { success: false, streak: s.currentStreak, xpReward: 0, coinReward: 0 };
    }

    const token = await getToken();
    if (token) {
      try {
        const result = await api.users.checkIn(uid, token);
        if (result.alreadyCheckedIn) {
          set({
            lastCheckInDate: today,
            currentStreak: result.streak,
            longestStreak: result.longestStreak,
            pending: false,
          });
          return { success: false, streak: result.streak, xpReward: 0, coinReward: 0 };
        }

        set({
          lastCheckInDate: today,
          currentStreak: result.streak,
          longestStreak: result.longestStreak,
          pending: false,
        });
        persistState({
          lastCheckInDate: today,
          currentStreak: result.streak,
          longestStreak: result.longestStreak,
          pending: false,
        });

        const currentProfile = useUserStore.getState().profile;
        if (currentProfile && typeof result.xp === "number" && typeof result.coins === "number") {
          const levelResult = getLevelProgress(result.xp, currentProfile.gamingLevel);
          const updatedProfile = {
            ...currentProfile,
            xp: result.xp,
            coins: result.coins,
            gamingLevel: levelResult.newLevel,
            rank: levelResult.newRank,
            nextLevelXp: levelResult.xpForNext,
          };
          useUserStore.getState().setProfile(updatedProfile);
          await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
          if (levelResult.newLevel !== currentProfile.gamingLevel) {
            api.users
              .update(uid, {
                gamingLevel: levelResult.newLevel,
                rank: levelResult.newRank,
                nextLevelXp: levelResult.xpForNext,
              }, token)
              .catch((err: any) =>
                console.warn("[CheckInStore] level sync failed:", err),
              );
          }
        }

        useStatsStore.getState().recordActivity(uid, getToken, 1);
        useUserTrophyStore.getState().check(uid, getToken);
        return { success: true, streak: result.streak, xpReward: result.xpReward, coinReward: result.coinReward };
      } catch {}
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newStreak: number;
    if (s.lastCheckInDate === yesterdayStr) {
      newStreak = s.currentStreak + 1;
    } else {
      newStreak = 1;
    }
    const newLongest = Math.max(newStreak, s.longestStreak);
    const xpReward = newStreak <= 3 ? 10 : newStreak <= 7 ? 25 : newStreak <= 14 ? 50 : 100;
    const coinReward = newStreak <= 3 ? 5 : newStreak <= 7 ? 10 : newStreak <= 14 ? 20 : 50;

    set({
      lastCheckInDate: today,
      currentStreak: newStreak,
      longestStreak: newLongest,
      pending: true,
    });
    persistState({
      lastCheckInDate: today,
      currentStreak: newStreak,
      longestStreak: newLongest,
      pending: true,
    });
    useStatsStore.getState().recordActivity(uid, getToken, 1);

    const currentProfile = useUserStore.getState().profile;
    if (currentProfile) {
      const updatedProfile = {
        ...currentProfile,
        xp: (currentProfile.xp || 0) + xpReward,
        coins: (currentProfile.coins || 0) + coinReward,
      };
      useUserStore.getState().setProfile(updatedProfile);
      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    }

    return { success: true, streak: newStreak, xpReward, coinReward };
  },

  canCheckIn: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().lastCheckInDate !== today;
  },
}));