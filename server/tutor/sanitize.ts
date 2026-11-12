import type { TutorMode, TutorPersona } from "../../types/tutor";

const PERSONAS: TutorPersona[] = [
  "exam_examiner",
  "patient_tutor",
  "study_coach",
  "custom",
];

const LEGACY_PERSONAS: Record<string, TutorPersona> = {
  waec_examiner: "exam_examiner",
};

const MODES: TutorMode[] = ["materials", "general"];

export function normalizePersona(value: unknown): TutorPersona {
  const raw = typeof value === "string" ? value : "";
  const migrated = LEGACY_PERSONAS[raw] ?? raw;
  return PERSONAS.includes(migrated as TutorPersona)
    ? (migrated as TutorPersona)
    : "patient_tutor";
}

export function sanitizeExamType(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 40);
}

export function normalizeMode(value: unknown): TutorMode {
  return typeof value === "string" && MODES.includes(value as TutorMode)
    ? (value as TutorMode)
    : "materials";
}

export function sanitizeInstructions(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1500);
}

export function sanitizeMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (!message) return null;
  return message.slice(0, 8000);
}

export function sanitizeTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const topic = value.replace(/\s+/g, " ").trim();
  if (topic.length < 3) return null;
  return topic.slice(0, 200);
}

export function sanitizeMaterialIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= 128);
  return [...new Set(ids)].slice(0, 20);
}

export function sanitizeMemoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter(isUuid);
  return [...new Set(ids)].slice(0, 12);
}

export function sanitizeNoteTexts(
  value: unknown,
): { title: string; content: string }[] {
  if (!Array.isArray(value)) return [];
  const notes: { title: string; content: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.content !== "string" || !entry.content.trim()) continue;
    notes.push({
      title:
        typeof entry.title === "string" && entry.title.trim()
          ? entry.title.trim().slice(0, 200)
          : "Note",
      content: entry.content.slice(0, 20000),
    });
    if (notes.length >= 20) break;
  }
  return notes;
}

export interface TutorHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export function sanitizeHistory(value: unknown): TutorHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const out: TutorHistoryEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (entry.role !== "user" && entry.role !== "assistant") continue;
    if (typeof entry.content !== "string") continue;
    out.push({ role: entry.role, content: entry.content.slice(0, 12000) });
  }
  return out.slice(-14);
}

export function deriveTitle(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean || "New chat";
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}
