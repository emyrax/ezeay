import { useEffect, useState } from "react";
import { Platform } from "react-native";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function detectReducedMotion(): boolean {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(detectReducedMotion);

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setPrefersReducedMotion(query.matches);

    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return prefersReducedMotion;
}
