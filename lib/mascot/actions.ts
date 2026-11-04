import type { GamificationAction } from "../../constants/gamificationImages";

export type MascotChapterTier = "perfect" | "great" | "good" | "average" | "low";

export interface MascotMeta {
  aspectRatio: number;
  opaque: boolean;
}

export const MASCOT_META: Record<GamificationAction, MascotMeta> = {
  mascot_celebrating: { aspectRatio: 360 / 640, opaque: true },
  mascot_disappointed: { aspectRatio: 360 / 640, opaque: true },
  mascot_emitting_energy: { aspectRatio: 1, opaque: false },
  mascot_jumping: { aspectRatio: 1, opaque: false },
  mascot_loading: { aspectRatio: 360 / 640, opaque: true },
  mascot_posing: { aspectRatio: 300 / 456, opaque: false },
  mascot_waving: { aspectRatio: 360 / 640, opaque: true },
};

export const MASCOT_LABELS: Record<GamificationAction, string> = {
  mascot_celebrating: "Yuinx mascot celebrating",
  mascot_disappointed: "Yuinx mascot looking disappointed",
  mascot_emitting_energy: "Yuinx mascot emitting energy",
  mascot_jumping: "Yuinx mascot jumping",
  mascot_loading: "Yuinx mascot loading",
  mascot_posing: "Yuinx mascot posing",
  mascot_waving: "Yuinx mascot waving",
};

export function selectScoreMascotAction(score: number): GamificationAction {
  if (score >= 80) return "mascot_celebrating";
  if (score >= 50) return "mascot_jumping";
  return "mascot_disappointed";
}

export function selectTierMascotAction(
  tier: MascotChapterTier,
): GamificationAction {
  if (tier === "perfect" || tier === "great") return "mascot_celebrating";
  if (tier === "good" || tier === "average") return "mascot_jumping";
  return "mascot_disappointed";
}
