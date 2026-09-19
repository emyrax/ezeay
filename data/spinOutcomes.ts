import type { MaterialCommunityIcons } from "@expo/vector-icons";

export type SpinActionType = "navigate" | "reward" | "free_spin";

export interface SpinOutcome {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  type: SpinActionType;
  navigateTo?: string;
  rewardXp?: number;
  rewardCoins?: number;
}

export const SPIN_SEGMENTS: SpinOutcome[] = [
  {
    id: "continue_learning",
    label: "Continue\nLearning",
    icon: "book-open-variant",
    color: "#4F8CFF",
    type: "navigate",
    navigateTo: "continue_course",
  },
  {
    id: "course_plan",
    label: "Course\nPlan",
    icon: "map-clock",
    color: "#00D68F",
    type: "navigate",
    navigateTo: "course_plan",
  },
  {
    id: "review_time",
    label: "Review\nTime",
    icon: "book-refresh",
    color: "#FF8A65",
    type: "navigate",
    navigateTo: "review",
  },
  {
    id: "bounty_hunt",
    label: "Bounty\nHunt",
    icon: "sword-cross",
    color: "#A855F7",
    type: "navigate",
    navigateTo: "bounties",
  },
  {
    id: "xp_10",
    label: "+10 XP",
    icon: "lightning-bolt",
    color: "#FFD700",
    type: "reward",
    rewardXp: 10,
  },
  {
    id: "xp_25",
    label: "+25 XP",
    icon: "flash",
    color: "#FF6B6B",
    type: "reward",
    rewardXp: 25,
  },
  {
    id: "coins_5",
    label: "+5 Coins",
    icon: "circle-multiple",
    color: "#38BDF8",
    type: "reward",
    rewardCoins: 5,
  },
  {
    id: "free_spin",
    label: "Free\nSpin",
    icon: "reload",
    color: "#34D399",
    type: "free_spin",
  },
];

export const SLOT_ICONS: { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] =
  SPIN_SEGMENTS.map((s) => ({ icon: s.icon, color: s.color }));

export function getRandomOutcome(): SpinOutcome {
  return SPIN_SEGMENTS[Math.floor(Math.random() * SPIN_SEGMENTS.length)];
}
