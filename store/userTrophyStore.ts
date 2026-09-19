import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import type { UserTrophy } from "../types/userTrophy";

const TROPHY_STORAGE_KEY = "@yuinx_user_trophies_v1";

interface UserTrophyStore {
  trophies: UserTrophy[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchTrophies: (
    userId: string,
    getToken: () => Promise<string | null>,
  ) => Promise<void>;
  earnedTrophyIds: () => string[];
  isEarned: (trophyId: string) => boolean;
  check: (userId: string, getToken: () => Promise<string | null>) => Promise<void>;
  retry: () => Promise<void>;
}

let lastFetchParams: { userId: string; getToken: () => Promise<string | null> } | null = null;

export const useUserTrophyStore = create<UserTrophyStore>((set, get) => ({
  trophies: [],
  loaded: false,
  loading: false,
  error: null,

  fetchTrophies: async (userId, getToken) => {
    const state = get();
    if (state.loading) return;

    lastFetchParams = { userId, getToken };
    set({ loading: true, error: null });

    try {
      const stored = await AsyncStorage.getItem(TROPHY_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as UserTrophy[];
          set({ trophies: parsed, loaded: true, loading: false });
        } catch {
          // corrupted
        }
      }

      const token = await getToken();
      if (token) {
        try {
          const result = await api.userTrophies.getAll(userId, token);
          await AsyncStorage.setItem(TROPHY_STORAGE_KEY, JSON.stringify(result));
          set({ trophies: result, loaded: true, loading: false, error: null });
          return;
        } catch (err) {
          console.error("[UserTrophyStore] API fetch failed:", err);
        }
      }

      if (!get().loaded) {
        set({ loaded: true, loading: false, trophies: [] });
      }
    } catch (err) {
      console.error("[UserTrophyStore] fetchTrophies failed:", err);
      set({ loading: false, loaded: true, error: "Failed to load trophies." });
    }
  },

  earnedTrophyIds: () => {
    return get().trophies.map((t) => t.trophyId);
  },

  isEarned: (trophyId) => {
    return get().trophies.some((t) => t.trophyId === trophyId);
  },

  check: async (userId, getToken) => {
    const token = await getToken();
    if (!token) return;
    try {
      const result = await api.userTrophies.check(userId, token);
      if (result.awarded && result.awarded.length > 0) {
        const merged = [...get().trophies, ...result.awarded];
        await AsyncStorage.setItem(TROPHY_STORAGE_KEY, JSON.stringify(merged));
        set({ trophies: merged, loaded: true });
      }
    } catch (err) {
      console.warn("[UserTrophyStore] check failed:", err);
    }
  },

  retry: async () => {
    if (lastFetchParams) {
      await get().fetchTrophies(lastFetchParams.userId, lastFetchParams.getToken);
    }
  },
}));
