import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUserStore } from "./userStore";

const STORAGE_KEY = "@yuinx_missions_v1";

export const MISSION_ORDER = ["checkin", "bounty", "spin", "share"] as const;
export type MissionKey = (typeof MISSION_ORDER)[number];

export interface MissionDef {
  key: MissionKey;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
  xp: number;
  coins: number;
}

interface MissionCompletion {
  rewarded: boolean;
  at: number;
}

interface MissionState {
  cycleKey: string | null;
  completions: Partial<Record<MissionKey, MissionCompletion>>;
  cycleBonusClaimed: boolean;
  cycleBonusXp: number;
  pendingReward: MissionDef | null;
}

interface MissionStore extends MissionState {
  load: () => Promise<void>;
  beginCycleIfNeeded: () => boolean;
  isDone: (key: MissionKey) => boolean;
  markCompleted: (
    mission: MissionDef,
    options?: { grant?: boolean; silent?: boolean; getToken?: () => Promise<string | null> },
  ) => Promise<boolean>;
  maybeClaimCycleBonus: (getToken: () => Promise<string | null>, completedCount: number) => Promise<void>;
  dismissReward: () => void;
  reset: () => void;
}

export const ALL_MISSION_KEYS: MissionKey[] = [...MISSION_ORDER];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function computeCycleKey(now: Date = new Date()): string {
  const hour = now.getHours();
  const d = new Date(now);
  let suffix = "AM";
  if (hour >= 18) {
    suffix = "PM";
  } else if (hour < 6) {
    d.setDate(d.getDate() - 1);
    suffix = "PM";
  }
  const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${dateKey}:${suffix}`;
}

export function getCycleLabel(cycleKey: string | null): string {
  if (!cycleKey) return "";
  return cycleKey.endsWith(":AM") ? "Morning" : "Evening";
}

function persistState(state: Pick<MissionState, "cycleKey" | "completions" | "cycleBonusClaimed" | "cycleBonusXp">) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  cycleKey: null,
  completions: {},
  cycleBonusClaimed: false,
  cycleBonusXp: 0,
  pendingReward: null,

  load: async () => {
    try {
      const storedRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedRaw) {
        const stored = JSON.parse(storedRaw) as MissionState;
        set({
          cycleKey: stored.cycleKey ?? null,
          completions: stored.completions ?? {},
          cycleBonusClaimed: stored.cycleBonusClaimed ?? false,
          cycleBonusXp: stored.cycleBonusXp ?? 0,
        });
      }
    } catch {
      // corrupted storage is fine; default state stays
    }
    get().beginCycleIfNeeded();
  },

  beginCycleIfNeeded: () => {
    const currentCycle = computeCycleKey();
    const s = get();
    if (s.cycleKey === currentCycle) return false;

    const hadProgress =
      s.completions && (Object.keys(s.completions).length > 0 || s.cycleBonusClaimed);

    const next: MissionState = {
      cycleKey: currentCycle,
      completions: {},
      cycleBonusClaimed: false,
      cycleBonusXp: 0,
      pendingReward: null,
    };
    set(next);
    persistState(next);
    return hadProgress;
  },

  isDone: (key) => {
    const s = get();
    return s.cycleKey === computeCycleKey() && s.completions[key]?.rewarded === true;
  },

  markCompleted: async (mission, options) => {
    get().beginCycleIfNeeded();
    const s = get();
    if (s.completions[mission.key]?.rewarded) return false;

    if (options?.grant && (mission.xp > 0 || mission.coins > 0)) {
      const token = options.getToken ? await options.getToken() : null;
      if (token) {
        await useUserStore
          .getState()
          .addRewards(mission.xp, mission.coins, token)
          .catch(() => {});
      }
    }

    const next = {
      ...s,
      completions: {
        ...s.completions,
        [mission.key]: { rewarded: true, at: Date.now() },
      },
      pendingReward: options?.silent ? s.pendingReward : mission,
    };
    set(next);
    persistState(next);
    return true;
  },

  maybeClaimCycleBonus: async (getToken, completedCount) => {
    get().beginCycleIfNeeded();
    const s = get();
    if (s.cycleBonusClaimed || completedCount < MISSION_ORDER.length) return;

    const xp = 5 + Math.floor(Math.random() * 6);
    const token = await getToken();
    if (token) {
      await useUserStore
        .getState()
        .addRewards(xp, 0, token)
        .catch(() => {});
    }

    const next = { ...get(), cycleBonusClaimed: true, cycleBonusXp: xp };
    set(next);
    persistState(next);
  },

  dismissReward: () => {
    if (!get().pendingReward) return;
    set({ pendingReward: null });
  },

  reset: () => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    set({
      cycleKey: null,
      completions: {},
      cycleBonusClaimed: false,
      cycleBonusXp: 0,
      pendingReward: null,
    });
  },
}));