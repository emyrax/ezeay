export type MascotNetwork = "fast" | "slow";

export type MascotMotion = "auto" | "static";

export type MascotSourceDecision = "animated" | "poster" | "native";

export interface MascotSourceContext {
  isWeb: boolean;
  hasWebSources: boolean;
  inView: boolean;
  network: MascotNetwork;
  reducedMotion: boolean;
  motion: MascotMotion;
  animationFailed: boolean;
}

/**
 * Decides which mascot asset to render.
 *
 * Web never falls back to the large native animated WebP: it either plays the
 * compact variant or shows the lightweight poster. Offscreen, slow, save-data
 * and reduced-motion contexts stay on the poster so decoding and bandwidth are
 * spent only when the mascot is actually visible.
 */
export function selectMascotSource(
  context: MascotSourceContext,
): MascotSourceDecision {
  if (!context.isWeb || !context.hasWebSources) return "native";
  if (context.motion === "static") return "poster";
  if (context.reducedMotion) return "poster";
  if (!context.inView) return "poster";
  if (context.network !== "fast") return "poster";
  if (context.animationFailed) return "poster";
  return "animated";
}
