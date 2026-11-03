import type { ReelChallengeType } from "./community";

export interface ReelDailyProgress {
  date: string;
  answered: number;
  goal: number;
  streak: number;
  goalMet: boolean;
  bonusUnlocked: boolean;
  xpToday: number;
  dailyXpCap: number;
  bonusXp: number;
}

export interface ReelChallengeAttempt {
  courseId: string;
  chapterIndex: number;
  subtopicIndex: number;
  challengeType: ReelChallengeType;
  selectedIndex: number;
  correct: boolean;
  correctChoiceIndex: number;
  revealText: string;
  xpAwarded: number;
  bonusXp: number;
  alreadyAnswered: boolean;
}

export interface ReelChallengeResponse {
  attempt: ReelChallengeAttempt;
  distribution: number[];
  totalAnswers: number;
  daily: ReelDailyProgress;
}
