import type { ImageProps } from "expo-image";
import type { GamificationAction } from "./gamificationImages";

export interface MascotWebSources {
  poster: ImageProps["source"];
  animated: ImageProps["source"];
}

export type MascotWebImageMap = Record<GamificationAction, MascotWebSources>;

export const mascotWebImages: MascotWebImageMap | null = null;
