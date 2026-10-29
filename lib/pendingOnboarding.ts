import AsyncStorage from "@react-native-async-storage/async-storage";
import { EMPTY_ONBOARDING_ANSWERS } from "../data/onboarding";
import type { OnboardingAnswers, PendingOnboarding } from "../types/onboarding";

const PENDING_ONBOARDING_KEY = "pendingOnboarding";
const LEGACY_PENDING_GOALS_KEY = "pendingLearningGoals";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeAnswers(value: unknown): OnboardingAnswers {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    displayName: asString(input.displayName),
    birthday: asString(input.birthday),
    country: asString(input.country),
    region: asString(input.region),
    schoolType: asString(input.schoolType),
    school: asString(input.school),
    grade: asString(input.grade),
    degree: asString(input.degree),
    majorCourse: asString(input.majorCourse),
    subjects: asStringArray(input.subjects),
    learningGoals: asStringArray(input.learningGoals),
  };
}

export async function savePendingOnboarding(
  answers: OnboardingAnswers,
): Promise<void> {
  const payload: PendingOnboarding = {
    version: 1,
    answers: normalizeAnswers(answers),
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(payload));
}

export async function readPendingOnboarding(): Promise<PendingOnboarding | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_ONBOARDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingOnboarding>;
    if (parsed.version !== 1 || !parsed.answers) return null;
    return {
      version: 1,
      answers: normalizeAnswers(parsed.answers),
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[pendingOnboarding] read failed:", err);
    return null;
  }
}

export async function clearPendingOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_ONBOARDING_KEY);
}

export async function readLegacyPendingGoals(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_PENDING_GOALS_KEY);
    if (!raw) return null;
    const goals = JSON.parse(raw) as unknown;
    return Array.isArray(goals)
      ? goals.filter((goal): goal is string => typeof goal === "string")
      : null;
  } catch {
    return null;
  }
}

export async function clearLegacyPendingGoals(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_PENDING_GOALS_KEY);
}

export async function hasPendingOnboarding(): Promise<boolean> {
  const pending = await readPendingOnboarding();
  if (pending) return true;
  const legacy = await readLegacyPendingGoals();
  return !!legacy && legacy.length > 0;
}

export function pendingAnswersOrEmpty(
  pending: PendingOnboarding | null,
): OnboardingAnswers {
  return pending?.answers ?? { ...EMPTY_ONBOARDING_ANSWERS };
}
