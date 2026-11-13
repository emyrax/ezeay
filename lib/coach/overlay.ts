import { BREAKPOINTS } from "../../constants/layout";

export type CoachOverlayPreference = "auto" | "sheet" | "popup" | "panel";
export type CoachOverlayMode = "sheet" | "popup" | "panel";

export function getCoachOverlayMode({
  width,
  isWeb,
  preference = "auto",
}: {
  width: number;
  isWeb: boolean;
  preference?: CoachOverlayPreference;
}): CoachOverlayMode {
  if (!isWeb || width < BREAKPOINTS.laptop) return "sheet";
  if (preference === "sheet") return "sheet";
  if (preference === "panel") return "panel";
  return "popup";
}
