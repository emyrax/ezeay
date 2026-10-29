import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useOnboardingStore } from "../../store/onboardingStore";
import { getStep } from "../../data/onboarding";
import {
  getFirstIncompleteStepId,
  getNextStepId,
  getPreviousStepId,
  getVisibleSteps,
  isOnboardingStepId,
  validateStep,
} from "../../lib/onboarding/steps";
import { answersToProfileUpdates } from "../../lib/onboarding/merge";
import { savePendingOnboarding } from "../../lib/pendingOnboarding";
import type {
  OnboardingErrors,
  OnboardingStepId,
} from "../../types/onboarding";
import LoadingScreen from "../LoadingScreen";
import CountryPicker from "./CountryPicker";
import OnboardingShell from "./OnboardingShell";
import { OnboardingStepContent } from "./steps";

export default function OnboardingFlow() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const { user, profile, saveProfile } = useAuth();

  const answers = useOnboardingStore((s) => s.answers);
  const currentStepId = useOnboardingStore((s) => s.currentStepId);
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const setAnswerStore = useOnboardingStore((s) => s.setAnswer);
  const setAnswersStore = useOnboardingStore((s) => s.setAnswers);
  const setStep = useOnboardingStore((s) => s.setStep);
  const reset = useOnboardingStore((s) => s.reset);

  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [finishError, setFinishError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);
  const lastUrlStepRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;

    const state = useOnboardingStore.getState();
    const requested = Array.isArray(params.step) ? params.step[0] : params.step;
    const visible = getVisibleSteps(state.answers);
    const requestedVisible =
      requested &&
      isOnboardingStepId(requested) &&
      visible.some((step) => step.id === requested);

    let next: OnboardingStepId;
    if (requestedVisible) {
      next = requested as OnboardingStepId;
    } else if (
      isOnboardingStepId(state.currentStepId) &&
      visible.some((step) => step.id === state.currentStepId)
    ) {
      next = state.currentStepId;
    } else {
      next = "welcome";
    }

    if (
      !requested &&
      state.currentStepId === "welcome" &&
      (state.answers.displayName.trim() || state.answers.country)
    ) {
      next = getFirstIncompleteStepId(state.answers);
    }

    setStep(next);
    lastUrlStepRef.current = next;
    if (Platform.OS === "web" && requested !== next) {
      router.replace({ pathname: "/onboarding", params: { step: next } });
    }
  }, [hydrated, params.step, router, setStep]);

  useEffect(() => {
    if (!hydrated || !initializedRef.current) return;
    const requested = Array.isArray(params.step) ? params.step[0] : params.step;
    if (!requested || !isOnboardingStepId(requested)) return;
    if (requested === lastUrlStepRef.current) return;
    const visible = getVisibleSteps(answers).some(
      (step) => step.id === requested,
    );
    if (!visible) return;
    lastUrlStepRef.current = requested;
    if (requested !== currentStepId) {
      setStep(requested);
    }
  }, [answers, currentStepId, hydrated, params.step, setStep]);

  useEffect(() => {
    if (!hydrated) return;
    if (answers.displayName.trim()) return;
    const name = user?.displayName?.trim();
    if (name) setAnswerStore("displayName", name);
  }, [answers.displayName, hydrated, setAnswerStore, user?.displayName]);

  function setAnswer<K extends keyof typeof answers>(
    key: K,
    value: (typeof answers)[K],
  ) {
    setAnswerStore(key, value);
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFinishError(null);
  }

  function setAnswers(updates: Partial<typeof answers>) {
    setAnswersStore(updates);
    setErrors({});
    setFinishError(null);
  }

  function goToStep(next: OnboardingStepId) {
    setErrors({});
    setFinishError(null);
    setStep(next);
    lastUrlStepRef.current = next;
    if (Platform.OS === "web") {
      router.push({ pathname: "/onboarding", params: { step: next } });
    } else {
      router.setParams({ step: next });
    }
  }

  function handleBack() {
    const previous = getPreviousStepId(currentStepId, answers);
    if (!previous) {
      router.replace("/");
      return;
    }
    goToStep(previous);
  }

  function handleSkip() {
    if (currentStepId === "birthday") {
      setAnswerStore("birthday", "");
    }
    const next = getNextStepId(currentStepId, answers);
    if (next) goToStep(next);
  }

  async function finishOnboarding() {
    for (const step of getVisibleSteps(answers)) {
      const stepErrors = validateStep(step.id, answers);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setFinishError("Please finish this step before creating your profile.");
        if (step.id !== currentStepId) goToStep(step.id);
        return;
      }
    }

    setSaving(true);
    setFinishError(null);
    try {
      if (user && profile) {
        await saveProfile(answersToProfileUpdates(answers));
        reset();
        router.replace("/(tabs)");
        return;
      }

      await savePendingOnboarding(answers);
      router.push({
        pathname: "/login",
        params: { mode: "signup", from: "onboarding" },
      });
    } catch (err) {
      setFinishError(
        err instanceof Error
          ? err.message
          : "We couldn’t save your answers. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (currentStepId === "ready") {
      void finishOnboarding();
      return;
    }

    const stepErrors = validateStep(currentStepId, answers);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    const next = getNextStepId(currentStepId, answers);
    if (!next) {
      void finishOnboarding();
      return;
    }
    goToStep(next);
  }

  if (!hydrated) {
    return <LoadingScreen message="Loading your path…" />;
  }

  const step = getStep(currentStepId);

  return (
    <>
      <OnboardingShell
        step={step}
        answers={answers}
        onBack={handleBack}
        onNext={handleNext}
        onSkip={handleSkip}
        onExit={() => router.replace("/")}
        saving={saving}
        error={finishError}
      >
        <OnboardingStepContent
          step={step}
          answers={answers}
          errors={errors}
          setAnswer={setAnswer}
          setAnswers={setAnswers}
          onOpenCountry={() => setCountryOpen(true)}
          onSignIn={() =>
            router.push({
              pathname: "/login",
              params: { from: "onboarding" },
            })
          }
          isSignedIn={!!user}
          email={user?.email}
        />
      </OnboardingShell>

      <CountryPicker
        visible={countryOpen}
        selected={answers.country}
        onSelect={(country) => {
          setAnswer("country", country);
          setErrors((prev) => ({ ...prev, country: undefined }));
        }}
        onClose={() => setCountryOpen(false)}
      />
    </>
  );
}
