export type OnboardingStepId =
  | "welcome"
  | "name"
  | "birthday"
  | "country"
  | "region"
  | "schoolType"
  | "school"
  | "grade"
  | "degree"
  | "subjects"
  | "goals"
  | "ready";

export interface OnboardingAnswers {
  displayName: string;
  birthday: string;
  country: string;
  region: string;
  schoolType: string;
  school: string;
  grade: string;
  degree: string;
  majorCourse: string;
  subjects: string[];
  learningGoals: string[];
}

export type OnboardingErrorKey =
  | "displayName"
  | "birthday"
  | "country"
  | "schoolType"
  | "subjects"
  | "learningGoals"
  | "form";

export type OnboardingErrors = Partial<Record<OnboardingErrorKey, string>>;

export interface OnboardingStep {
  id: OnboardingStepId;
  eyebrow: string;
  title: string;
  subtitle: string;
  optional?: boolean;
}

export interface PendingOnboarding {
  version: 1;
  answers: OnboardingAnswers;
  savedAt: string;
}
