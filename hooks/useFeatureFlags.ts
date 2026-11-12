import { useMemo } from "react";

const TUTOR_ENABLED = process.env.EXPO_PUBLIC_TUTOR_ENABLED === "true";
const AGENT_ENABLED = process.env.EXPO_PUBLIC_AGENT_ENABLED === "true";
const LEGACY_TUTOR_ENABLED =
  process.env.EXPO_PUBLIC_LEGACY_TUTOR_ENABLED === "true";

export interface FeatureFlags {
  agent: boolean;
  tutor: boolean;
  legacyTutor: boolean;
}

export function useFeatureFlags(): FeatureFlags {
  return useMemo(
    () => ({
      agent: AGENT_ENABLED,
      tutor: TUTOR_ENABLED,
      legacyTutor: LEGACY_TUTOR_ENABLED,
    }),
    [],
  );
}
