import type {
  ExploreResourcePost,
  FeedSubtopic,
  ReelChallengeType,
  ReelHookMeta,
  ReelHookTone,
} from "../../types/community";

export interface NormalizedReelChallenge {
  hook: string;
  hookTone: ReelHookTone;
  toneLabel: string;
  challengeType: ReelChallengeType;
  challengeLabel: string;
  challengePrompt: string;
  options: string[];
  correctChoiceIndex: number;
  revealText: string;
  shareCopy: string;
  xpReward: number;
}

const FALLBACK_OPTIONS = [
  "Focus on the core principle",
  "Memorize the surface detail",
  "Guess and move on",
];

const TONE_LABELS: Record<ReelHookTone, string> = {
  curious: "CURIOUS",
  challenge: "CHALLENGE",
  misconception: "MYTH CHECK",
  "fast-win": "FAST WIN",
};

const TYPE_LABELS: Record<ReelChallengeType, string> = {
  prediction: "PREDICTION",
  vote: "COMMUNITY VOTE",
  "multiple-choice": "CHALLENGE",
  misconception: "MYTH CHECK",
};

const CHALLENGE_TYPES: ReelChallengeType[] = [
  "prediction",
  "vote",
  "multiple-choice",
  "misconception",
];

const HOOK_TONES: ReelHookTone[] = ["curious", "challenge", "misconception", "fast-win"];

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function cleanIndex(value: unknown, length: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), Math.max(0, length - 1));
}

export function normalizeReelChallenge(
  meta: ReelHookMeta | undefined,
  title = "this topic",
): NormalizedReelChallenge {
  const options = cleanOptions(meta?.challengeOptions);
  const safeOptions = options.length >= 2 ? options : FALLBACK_OPTIONS;
  const challengeType = CHALLENGE_TYPES.includes(meta?.challengeType as ReelChallengeType)
    ? (meta?.challengeType as ReelChallengeType)
    : "multiple-choice";
  const hookTone = HOOK_TONES.includes(meta?.hookTone as ReelHookTone)
    ? (meta?.hookTone as ReelHookTone)
    : "curious";
  const xpReward =
    typeof meta?.xpReward === "number" && Number.isFinite(meta.xpReward)
      ? Math.min(30, Math.max(10, Math.floor(meta.xpReward)))
      : 20;

  return {
    hook:
      cleanText(meta?.hook, 200) ||
      `The key insight in ${title || "this topic"}`,
    hookTone,
    toneLabel: TONE_LABELS[hookTone],
    challengeType,
    challengeLabel: TYPE_LABELS[challengeType],
    challengePrompt:
      cleanText(meta?.challengePrompt, 300) ||
      `What is the core principle behind ${title || "this concept"}?`,
    options: safeOptions,
    correctChoiceIndex: cleanIndex(meta?.correctChoiceIndex, safeOptions.length),
    revealText:
      cleanText(meta?.revealText, 500) ||
      `${title || "This concept"} is best mastered through active practice and recall.`,
    shareCopy:
      cleanText(meta?.shareCopy, 200) ||
      `Game-changing takeaway on ${title || "this topic"}!`,
    xpReward,
  };
}

export function normalizeSubtopicChallenge(subtopic: FeedSubtopic): NormalizedReelChallenge {
  return normalizeReelChallenge(subtopic, subtopic.title);
}

export function normalizeResourceChallenge(
  resource: ExploreResourcePost,
): NormalizedReelChallenge {
  return normalizeReelChallenge(
    {
      hook: resource.hook,
      hookTone: resource.hookTone,
      challengeType: resource.challengeType,
      challengePrompt: resource.challengePrompt,
      challengeOptions: resource.challengeOptions,
      correctChoiceIndex: resource.correctChoiceIndex,
      revealText: resource.revealText,
      shareCopy: resource.shareCopy,
      xpReward: resource.xpReward,
    },
    resource.title,
  );
}
