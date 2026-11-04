export const gamificationImages = {
  mascot_celebrating: require("../assets/mascot/gamification/mascot_celebrating.webp"),
  mascot_disappointed: require("../assets/mascot/gamification/mascot_disappointed.webp"),
  mascot_emitting_energy: require("../assets/mascot/gamification/mascot_emitting_energy.webp"),
  mascot_jumping: require("../assets/mascot/gamification/mascot_jumping.webp"),
  mascot_loading: require("../assets/mascot/gamification/mascot_loading.webp"),
  mascot_posing: require("../assets/mascot/gamification/mascot_posing.webp"),
  mascot_waving: require("../assets/mascot/gamification/mascot_waving.webp"),
} as const;

export type GamificationAction = keyof typeof gamificationImages;
