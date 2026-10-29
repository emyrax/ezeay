import { AFRICAN_COUNTRIES } from "../../data/countries";
import {
  MAX_GOALS,
  MAX_SUBJECTS,
  MIN_AGE,
  ONBOARDING_STEPS,
  requiresDegree,
  supportsGrade,
} from "../../data/onboarding";
import type {
  OnboardingAnswers,
  OnboardingErrors,
  OnboardingStep,
  OnboardingStepId,
} from "../../types/onboarding";

export function isOnboardingStepId(value: string): value is OnboardingStepId {
  return ONBOARDING_STEPS.some((step) => step.id === value);
}

export function isStepVisible(
  step: OnboardingStep,
  answers: OnboardingAnswers,
): boolean {
  if (step.id === "grade") return supportsGrade(answers.schoolType);
  if (step.id === "degree") return requiresDegree(answers.schoolType);
  return true;
}

export function getVisibleSteps(answers: OnboardingAnswers): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => isStepVisible(step, answers));
}

export function getStepIndex(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
): number {
  return getVisibleSteps(answers).findIndex((step) => step.id === stepId);
}

export function getNextStepId(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
): OnboardingStepId | null {
  const steps = getVisibleSteps(answers);
  const index = steps.findIndex((step) => step.id === stepId);
  if (index < 0) return steps[0]?.id ?? null;
  return steps[index + 1]?.id ?? null;
}

export function getPreviousStepId(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
): OnboardingStepId | null {
  const steps = getVisibleSteps(answers);
  const index = steps.findIndex((step) => step.id === stepId);
  if (index <= 0) return null;
  return steps[index - 1]?.id ?? null;
}

export function getProgress(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
): { current: number; total: number; ratio: number } {
  const steps = getVisibleSteps(answers);
  const index = Math.max(0, steps.findIndex((step) => step.id === stepId));
  const total = Math.max(1, steps.length);
  return {
    current: index + 1,
    total,
    ratio: (index + 1) / total,
  };
}

export function parseBirthdayDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function ageOn(date: Date, now = new Date()): number {
  let age = now.getFullYear() - date.getFullYear();
  const month = now.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

export function validateStep(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
): OnboardingErrors {
  const errors: OnboardingErrors = {};

  switch (stepId) {
    case "name": {
      const name = answers.displayName.trim();
      if (name.length < 2) errors.displayName = "Enter at least 2 characters.";
      else if (name.length > 40) errors.displayName = "Keep your name under 40 characters.";
      break;
    }
    case "birthday": {
      if (!answers.birthday.trim()) break;
      const parsed = parseBirthdayDate(answers.birthday);
      if (!parsed) {
        errors.birthday = "Use the format YYYY-MM-DD.";
        break;
      }
      const age = ageOn(parsed);
      if (age < MIN_AGE) errors.birthday = `Yuinx is for learners ${MIN_AGE} and older.`;
      else if (age > 100) errors.birthday = "Please check your date of birth.";
      break;
    }
    case "country": {
      if (!answers.country) errors.country = "Choose your country.";
      else if (!AFRICAN_COUNTRIES.some((item) => item.name === answers.country)) {
        errors.country = "Choose a country from the list.";
      }
      break;
    }
    case "schoolType": {
      if (!answers.schoolType) errors.schoolType = "Choose your learning stage.";
      break;
    }
    case "subjects": {
      const subjects = uniqueStrings(answers.subjects);
      if (subjects.length === 0) errors.subjects = "Pick at least one subject.";
      else if (subjects.length > MAX_SUBJECTS) {
        errors.subjects = `Pick up to ${MAX_SUBJECTS} subjects.`;
      }
      break;
    }
    case "goals": {
      const goals = uniqueStrings(answers.learningGoals);
      if (goals.length === 0) errors.learningGoals = "Pick at least one goal.";
      else if (goals.length > MAX_GOALS) {
        errors.learningGoals = `Pick up to ${MAX_GOALS} goals.`;
      }
      break;
    }
    default:
      break;
  }

  return errors;
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function getFirstIncompleteStepId(
  answers: OnboardingAnswers,
): OnboardingStepId {
  for (const step of getVisibleSteps(answers)) {
    if (Object.keys(validateStep(step.id, answers)).length === 0) continue;
    return step.id;
  }
  return "ready";
}

export function resolveStepParam(
  value: string | string[] | undefined,
  answers: OnboardingAnswers,
): OnboardingStepId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !isOnboardingStepId(raw)) return getFirstIncompleteStepId(answers);
  const visible = getVisibleSteps(answers).some((step) => step.id === raw);
  return visible ? raw : getFirstIncompleteStepId(answers);
}

export function isStepComplete(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
): boolean {
  return Object.keys(validateStep(stepId, answers)).length === 0;
}
