import { create } from "zustand";
import { api } from "../lib/api";
import { getLevelProgress } from "../services/LevelService";
import type { UserProfile } from "../types/user";

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  xpVersion: number;
  setProfile: (profile: UserProfile | null) => void;
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addRewards: (xp: number, coins: number, token: string) => Promise<boolean>;
  refreshProfile: (uid: string, token: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  xpVersion: 0,
  setProfile: (profile) => set({ profile, error: null }),
  clearProfile: () => set({ profile: null, error: null, xpVersion: 0 }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addRewards: async (xp, coins, token) => {
    const profile = get().profile;
    if (!profile) return false;

    const newXp = profile.xp + xp;
    const newCoins = profile.coins + coins;
    const levelResult = getLevelProgress(newXp, profile.gamingLevel);

    const updated = {
      ...profile,
      xp: newXp,
      coins: newCoins,
      gamingLevel: levelResult.newLevel,
      rank: levelResult.newRank,
      nextLevelXp: levelResult.xpForNext,
    };

    set({ profile: updated, xpVersion: get().xpVersion + 1 });

    try {
      await api.users.update(profile.uid, {
        xp: newXp,
        coins: newCoins,
        gamingLevel: levelResult.newLevel,
        rank: levelResult.newRank,
        nextLevelXp: levelResult.xpForNext,
      }, token);
      return true;
    } catch (err) {
      console.error("[UserStore] addRewards failed:", err);
      set({ profile });
      return false;
    }
  },

  refreshProfile: async (uid, token) => {
    try {
      const apiProfile = await api.users.get(uid, token);
      const { toProfile } = await import("../contexts/AuthContext");
      const userProfile = toProfile(apiProfile);
      set({ profile: userProfile, xpVersion: get().xpVersion + 1 });
    } catch (err) {
      console.error("[UserStore] refreshProfile failed:", err);
    }
  },
}));
