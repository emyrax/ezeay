export function deriveHandle(displayName: string | null | undefined, uid: string): string {
  const base = (displayName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  const suffix = uid.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toLowerCase() || "0000";
  return `${base || "scholar"}-${suffix}`;
}

export function deriveIqScore(xp: number): number {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  return 100 + Math.min(100, Math.floor(Math.sqrt(safeXp) * 2));
}
