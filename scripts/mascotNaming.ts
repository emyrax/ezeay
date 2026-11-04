export function toSnakeCaseAction(raw: string): string {
  const body = raw
    .trim()
    .toLowerCase()
    .replace(/^mascot[\s_-]*/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!body) return "";

  return `mascot_${body}`.slice(0, 60).replace(/_+$/g, "");
}

export function isValidActionName(name: string): boolean {
  return /^mascot_[a-z0-9]+(?:_[a-z0-9]+)*$/.test(name);
}

export function uniqueActionName(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}
