import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SPIN_STORAGE_KEY = "@yuinx_spin_v1";

const DAILY_LIMIT = 3;
const COOLDOWN_MS = 30 * 60 * 1000;
const SESSION_TRIGGER_KEY = "@yuinx_spin_session";

interface SpinState {
  spinsRemaining: number;
  lastSpinAt: number | null;
  lastSpinDate: string | null;
  totalSpins: number;
}

interface SpinTriggerOptions {
  force?: boolean;
  defaultChance?: number;
}

interface SpinStore {
  spinsRemaining: number;
  lastSpinAt: number | null;
  lastSpinDate: string | null;
  totalSpins: number;
  wheelVisible: boolean;
  canSpin: () => boolean;
  useSpin: () => boolean;
  openWheel: () => void;
  closeWheel: () => void;
  resetDailySpins: () => Promise<void>;
  maybeTrigger: (context: "chapter_complete" | "level_up" | "dashboard_load", options?: SpinTriggerOptions) => boolean;
  markSessionTriggered: () => Promise<void>;
  hasSessionTriggered: () => Promise<boolean>;
  load: () => Promise<void>;
  reset: () => void;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useSpinStore = create<SpinStore>((set, get) => ({
  spinsRemaining: DAILY_LIMIT,
  lastSpinAt: null,
  lastSpinDate: null,
  totalSpins: 0,
  wheelVisible: false,

  openWheel: () => set({ wheelVisible: true }),

  closeWheel: () => set({ wheelVisible: false }),

  canSpin: () => {
    const s = get();
    if (s.spinsRemaining <= 0) return false;
    if (s.lastSpinAt && Date.now() - s.lastSpinAt < COOLDOWN_MS) return false;
    return true;
  },

  useSpin: () => {
    const s = get();
    if (!s.canSpin()) return false;
    set({
      spinsRemaining: s.spinsRemaining - 1,
      lastSpinAt: Date.now(),
      lastSpinDate: getTodayKey(),
    });
    const data = {
      spinsRemaining: s.spinsRemaining - 1,
      lastSpinAt: Date.now(),
      lastSpinDate: getTodayKey(),
      totalSpins: s.totalSpins + 1,
    };
    AsyncStorage.setItem(SPIN_STORAGE_KEY, JSON.stringify(data));
    return true;
  },

  resetDailySpins: async () => {
    set({ spinsRemaining: DAILY_LIMIT });
    const stored = await AsyncStorage.getItem(SPIN_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data.spinsRemaining = DAILY_LIMIT;
    await AsyncStorage.setItem(SPIN_STORAGE_KEY, JSON.stringify(data));
  },

  maybeTrigger: (context, options) => {
    if (options?.force) return true;
    if (!get().canSpin()) return false;
    const chance = options?.defaultChance;
    if (chance !== undefined) return Math.random() < chance;
    if (context === "level_up") return true;
    if (context === "chapter_complete") return Math.random() < 0.5;
    if (context === "dashboard_load") return Math.random() < 0.1;
    return false;
  },

  markSessionTriggered: async () => {
    await AsyncStorage.setItem(SESSION_TRIGGER_KEY, getTodayKey());
  },

  hasSessionTriggered: async () => {
    const val = await AsyncStorage.getItem(SESSION_TRIGGER_KEY);
    return val === getTodayKey();
  },

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(SPIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SpinState;
        const today = getTodayKey();
        if (parsed.lastSpinDate !== today) {
          set({ spinsRemaining: DAILY_LIMIT, lastSpinAt: null, lastSpinDate: today });
        } else {
          set({
            spinsRemaining: parsed.spinsRemaining ?? DAILY_LIMIT,
            lastSpinAt: parsed.lastSpinAt ?? null,
            lastSpinDate: parsed.lastSpinDate ?? today,
            totalSpins: parsed.totalSpins ?? 0,
          });
        }
      }
    } catch {
      set({ spinsRemaining: DAILY_LIMIT });
    }
  },

  reset: () =>
    set({
      spinsRemaining: DAILY_LIMIT,
      lastSpinAt: null,
      lastSpinDate: null,
      totalSpins: 0,
      wheelVisible: false,
    }),
}));
