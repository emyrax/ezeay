import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  courseNotifications: boolean;
  reminderNotifications: boolean;
  toggleCourseNotifications: () => void;
  toggleReminderNotifications: () => void;
  setCourseNotifications: (v: boolean) => void;
  setReminderNotifications: (v: boolean) => void;
  reset: () => void;
}

const SETTINGS_KEY = "@yuinx_settings_v1";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      courseNotifications: true,
      reminderNotifications: true,
      toggleCourseNotifications: () =>
        set((s) => ({ courseNotifications: !s.courseNotifications })),
      toggleReminderNotifications: () =>
        set((s) => ({ reminderNotifications: !s.reminderNotifications })),
      setCourseNotifications: (v) => set({ courseNotifications: v }),
      setReminderNotifications: (v) => set({ reminderNotifications: v }),
      reset: () => set({ courseNotifications: true, reminderNotifications: true }),
    }),
    {
      name: SETTINGS_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
