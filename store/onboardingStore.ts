import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  EMPTY_ONBOARDING_ANSWERS,
} from "../data/onboarding";
import type { OnboardingAnswers, OnboardingStepId } from "../types/onboarding";

interface OnboardingState {
  answers: OnboardingAnswers;
  currentStepId: OnboardingStepId;
  hydrated: boolean;
  setAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
  setAnswers: (updates: Partial<OnboardingAnswers>) => void;
  setStep: (stepId: OnboardingStepId) => void;
  reset: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      answers: { ...EMPTY_ONBOARDING_ANSWERS },
      currentStepId: "welcome",
      hydrated: false,
      setAnswer: (key, value) =>
        set((state) => ({
          answers: { ...state.answers, [key]: value },
        })),
      setAnswers: (updates) =>
        set((state) => ({
          answers: { ...state.answers, ...updates },
        })),
      setStep: (currentStepId) => set({ currentStepId }),
      reset: () =>
        set({
          answers: { ...EMPTY_ONBOARDING_ANSWERS },
          currentStepId: "welcome",
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "yuinx-onboarding-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        answers: state.answers,
        currentStepId: state.currentStepId,
      }),
      onRehydrateStorage: () => () => {
        useOnboardingStore.setState({ hydrated: true });
      },
    },
  ),
);
