import type { TutorCitation } from "../../types/tutor";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
}

export function cleanOptionalText(value: unknown, maxLength: number): string | null {
  const text = cleanText(value, maxLength);
  return text ? text : null;
}

export function cleanInt(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

export function cleanStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.slice(0, maxLength));
  return [...new Set(items)].slice(0, maxItems);
}

export function sanitizeCitations(value: unknown): TutorCitation[] {
  if (!Array.isArray(value)) return [];
  const out: TutorCitation[] = [];
  for (const item of value) {
    const entry = asRecord(item);
    if (!entry) continue;
    const quote = cleanText(entry.quote, 500);
    const source = cleanText(entry.source, 200);
    if (!quote || !source) continue;
    out.push({ quote, source });
    if (out.length >= 6) break;
  }
  return out;
}

export function dedupeCitations(citations: TutorCitation[]): TutorCitation[] {
  const seen = new Set<string>();
  const out: TutorCitation[] = [];
  for (const citation of citations) {
    const key = `${citation.source}\n${citation.quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(citation);
    if (out.length >= 6) break;
  }
  return out;
}

export function sanitizeUntrustedText(value: string, maxLength: number): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/<\/?tool_result[^>]*>/gi, "")
    .replace(/<\/?system[^>]*>/gi, "")
    .trim()
    .slice(0, maxLength);
}

export function formatUntrustedJson(value: unknown, maxLength: number): string {
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = String(value);
  }
  return sanitizeUntrustedText(serialized, maxLength);
}
