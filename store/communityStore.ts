import { create } from "zustand";
import { api } from "../lib/api";
import type { CommunityOverview } from "../types/community";

const TTL_MS = 5 * 60 * 1000;

interface CommunityStore {
  overview: CommunityOverview | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetch: (getToken: () => Promise<string | null>, force?: boolean) => Promise<void>;
  clear: () => void;
}

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  overview: null,
  loading: false,
  error: null,
  lastFetchedAt: null,

  fetch: async (getToken, force = false) => {
    const state = get();
    if (state.loading) return;

    const fresh = state.lastFetchedAt != null && Date.now() - state.lastFetchedAt < TTL_MS;
    if (!force && fresh && state.overview) return;

    set({ loading: true, error: null });
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const overview = await api.community.overview(token);
      set({ overview, loading: false, error: null, lastFetchedAt: Date.now() });
    } catch (err) {
      console.error("[CommunityStore] fetch failed:", err);
      set({ loading: false, error: "Failed to load the community." });
    }
  },

  clear: () => set({ overview: null, error: null, lastFetchedAt: null }),
}));