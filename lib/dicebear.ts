const DICEBEAR_BASE = "https://api.dicebear.com/10.x/shapes/svg";

export function getAvatarUrl(seed: string): string {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
}
