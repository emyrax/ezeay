import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QuickApp {
  id: string;
  icon: string;
  label: string;
  route?: string;
}

export const ALL_APPS: QuickApp[] = [
  { id: "study", icon: "book-open-page-variant", label: "Study", route: "/(study)" },
  { id: "notes", icon: "notebook-multiple", label: "My Notes", route: "/(notes)" },
  { id: "paddi", icon: "infinity", label: "MY Paddi" },
  { id: "resources", icon: "bank-outline", label: "Resources" },
  { id: "courses", icon: "school-outline", label: "Courses", route: "/(tabs)/quests" },
  { id: "stats", icon: "chart-bar", label: "Stats", route: "/(tabs)/stats" },
  { id: "profile", icon: "account-circle", label: "Profile", route: "/(tabs)/profile" },
  { id: "schedule", icon: "calendar-month-outline", label: "Schedule", route: "/(schedule)" },
  { id: "trophies", icon: "trophy-outline", label: "Trophies" },
  { id: "ai-tutor", icon: "robot-outline", label: "AI Tutor" },
  { id: "settings", icon: "cog-outline", label: "Settings" },
  { id: "community", icon: "account-group-outline", label: "Community" },
];

const DEFAULT_VISIBLE = ["study", "notes", "paddi", "resources"];

interface QuickAppState {
  visibleIds: string[];
  setVisibleIds: (ids: string[]) => void;
  addApp: (id: string) => void;
  removeApp: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  resetToDefaults: () => void;
}

const defaultState = { visibleIds: DEFAULT_VISIBLE };

export const useQuickAppStore = create<QuickAppState>()(
  persist(
    (set) => ({
      ...defaultState,
      setVisibleIds: (visibleIds) => set({ visibleIds }),
      addApp: (id) =>
        set((s) => {
          if (s.visibleIds.includes(id)) return s;
          return { visibleIds: [...s.visibleIds, id] };
        }),
      removeApp: (id) =>
        set((s) => ({
          visibleIds: s.visibleIds.filter((v) => v !== id),
        })),
      moveUp: (id) =>
        set((s) => {
          const idx = s.visibleIds.indexOf(id);
          if (idx <= 0) return s;
          const ids = [...s.visibleIds];
          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
          return { visibleIds: ids };
        }),
      moveDown: (id) =>
        set((s) => {
          const idx = s.visibleIds.indexOf(id);
          if (idx === -1 || idx >= s.visibleIds.length - 1) return s;
          const ids = [...s.visibleIds];
          [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
          return { visibleIds: ids };
        }),
      resetToDefaults: () => set({ visibleIds: DEFAULT_VISIBLE }),
    }),
    {
      name: "yuinx-quick-apps",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function getVisibleApps(ids: string[]): QuickApp[] {
  const map = new Map(ALL_APPS.map((a) => [a.id, a]));
  return ids.map((id) => map.get(id)).filter(Boolean) as QuickApp[];
}

export const ACTION_ITEM_WIDTH = 68;
const GRADIENT_USABLE_INSET = 8;

export function getMaxVisibleApps(width: number): number {
  const fits = Math.floor((width - GRADIENT_USABLE_INSET) / ACTION_ITEM_WIDTH);
  return Math.max(2, Math.min(fits - 1, ALL_APPS.length));
}
