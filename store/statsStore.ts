import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import type { DayActivity } from "../data/stats";

const STATS_KEY = "@yuinx_stats_v1";

interface StatsStore {
  days: DayActivity[];
  loaded: boolean;
  loading: boolean;
  reset: () => void;
  loadDays: (uid: string, getToken: () => Promise<string | null>) => Promise<void>;
  recordActivity: (
    uid: string,
    getToken: () => Promise<string | null>,
    count?: number,
  ) => Promise<void>;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function mergeDays(existing: DayActivity[], incoming: DayActivity[]): DayActivity[] {
  const map = new Map<string, DayActivity>();
  for (const d of existing) map.set(d.date, { ...d });
  for (const d of incoming) {
    const prior = map.get(d.date);
    map.set(d.date, { date: d.date, count: Math.max(prior?.count ?? 0, d.count) });
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  days: [],
  loaded: false,
  loading: false,

  reset: () => set({ days: [], loaded: false, loading: false }),

  loadDays: async (uid, getToken) => {
    if (get().loaded) {
      set({ loading: false });
      return;
    }
    set({ loading: true });

    const token = await getToken();
    if (token) {
      try {
        const res = await api.users.activity.get(uid, token, 90);
        if (res.activity.length > 0) {
          const days = res.activity as DayActivity[];
          await AsyncStorage.setItem(STATS_KEY, JSON.stringify(days)).catch(() => {});
          set({ days, loaded: true, loading: false });
          return;
        }
      } catch {
        // server unreachable — fall back to cached/mocked data below
      }
    }

    try {
      const stored = await AsyncStorage.getItem(STATS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DayActivity[];
        set({ days: parsed, loaded: true, loading: false });
      } else {
        set({ days: [], loaded: true, loading: false });
      }
    } catch {
      set({ days: [], loaded: true, loading: false });
    }
  },

  recordActivity: async (uid, getToken, count = 1) => {
    const { days } = get();
    const today = getTodayKey();
    const existing = days.find((d) => d.date === today);
    const next: DayActivity[] = existing
      ? days.map((d) => (d.date === today ? { ...d, count: d.count + count } : d))
      : [...days, { date: today, count }].sort((a, b) => (a.date < b.date ? -1 : 1));
    set({ days: next });
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(next)).catch(() => {});

    const token = await getToken();
    if (!token || !uid) return;
    try {
      await api.users.activity.post(uid, { date: today, activityType: "session", delta: count }, token);
      const res = await api.users.activity.get(uid, token, 90);
      if (res.activity.length > 0) {
        const serverDays = res.activity as DayActivity[];
        await AsyncStorage.setItem(STATS_KEY, JSON.stringify(serverDays)).catch(() => {});
        set({ days: mergeDays(next, serverDays) });
      }
    } catch {
      // offline — local optimistic count stays; will reconcile on next loadDays
    }
  },
}));