export interface Trophy {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditionType: TrophyConditionType;
  conditionValue: number;
  coinReward: number;
}

export type TrophyConditionType =
  | "courses_completed"
  | "xp_total"
  | "streak_days"
  | "bounties_claimed"
  | "modules_completed"
  | "gaming_level";
