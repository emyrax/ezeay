import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TutorPlan, TutorPlanInput } from "../types/tutor";

interface TutorPlanState {
  plan: TutorPlan | null;
  input: TutorPlanInput | null;
  savedKeys: string[];
  setPlan: (plan: TutorPlan, input: TutorPlanInput) => void;
  markSaved: (keys: string[]) => void;
  clear: () => void;
}

export const useTutorPlanStore = create<TutorPlanState>()(
  persist(
    (set) => ({
      plan: null,
      input: null,
      savedKeys: [],
      setPlan: (plan, input) => set({ plan, input, savedKeys: [] }),
      markSaved: (keys) =>
        set((state) => ({
          savedKeys: [...new Set([...state.savedKeys, ...keys])],
        })),
      clear: () => set({ plan: null, input: null, savedKeys: [] }),
    }),
    {
      name: "yuinx-tutor-plan",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
