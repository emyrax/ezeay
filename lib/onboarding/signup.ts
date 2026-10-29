import type { ApiUserCreateInput } from "../api";
import type { PendingOnboarding } from "../../types/onboarding";
import { answersToProfileUpdates } from "./merge";
import { uniqueStrings } from "./steps";

export interface SignupProfileBase {
  displayName: string;
  email: string;
  photoURL: string | null;
}

export function buildSignupProfile(
  base: SignupProfileBase,
  pending: PendingOnboarding | null,
  legacyGoals: string[] | null,
): ApiUserCreateInput {
  const updates = (pending
    ? answersToProfileUpdates(pending.answers)
    : {}) as Partial<ApiUserCreateInput>;
  const goals = pending
    ? updates.learningGoals ?? []
    : uniqueStrings(legacyGoals ?? []);
  const hasOnboarding = Boolean(pending) || goals.length > 0;

  return {
    ...updates,
    displayName: updates.displayName ?? base.displayName,
    email: base.email,
    photoURL: base.photoURL,
    ...(hasOnboarding
      ? {
          learningGoals: goals,
          onBoarded: true,
        }
      : {}),
  };
}
