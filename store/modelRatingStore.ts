import { create } from "zustand";
import { api } from "../lib/api";

interface ModelRatingState {
  ratings: Record<string, number>;
  setRatings: (ratings: Record<string, number>) => void;
  clearRatings: () => void;
  rate: (modelRef: string, rating: number | null, uid: string, token: string) => Promise<void>;
}

function sanitizeRatings(ratings: Record<string, number>): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const [ref, value] of Object.entries(ratings)) {
    if (Number.isInteger(value) && value >= 1 && value <= 5) clean[ref] = value;
  }
  return clean;
}

export const useModelRatingStore = create<ModelRatingState>((set, get) => ({
  ratings: {},
  setRatings: (ratings) => set({ ratings: sanitizeRatings(ratings) }),
  clearRatings: () => set({ ratings: {} }),
  rate: async (modelRef, rating, uid, token) => {
    const previous = get().ratings;
    const next = { ...previous };
    if (rating == null) {
      delete next[modelRef];
    } else {
      next[modelRef] = rating;
    }
    const clean = sanitizeRatings(next);
    set({ ratings: clean });
    try {
      await api.users.update(uid, { modelRatings: clean }, token);
    } catch (err) {
      set({ ratings: previous });
      throw err;
    }
  },
}));