import type {
  LessonCheckpoint,
  LessonDiagramNode,
  LessonReveal,
  LessonScriptDraft,
  LessonSlide,
  LessonVisual,
} from "../../types/lesson";

const MIN_SLIDES = 4;
const MAX_SLIDES = 8;
const MIN_NARRATION_WORDS = 20;
const MAX_NARRATION_WORDS = 180;
const MAX_CHECKPOINTS = 2;

const UNSAFE_LATEX =
  /\\(?:href|url|style|class|cssId|htmlId|require|includegraphics|def|newcommand|renewcommand|input|include|csname|futurelet|afterassignment)\b/i;

export class LessonScriptValidationError extends Error {
  constructor(
    message = "AI returned an invalid lesson script. Please try again or switch models.",
  ) {
    super(message);
    this.name = "LessonScriptValidationError";
  }
}

type NormalizedSlide = Omit<LessonSlide, "id">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripControl(value: string): string {
  let output = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    output += code < 32 || code === 127 ? " " : char;
  }
  return output;
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return stripControl(value).replace(/\s+/g, " ").trim().slice(0, maxLength).trim();
}

function cleanId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function clampCoordinate(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return 50;
  return Math.round(Math.min(100, Math.max(0, numeric)) * 10) / 10;
}

function normalizeLatex(value: unknown): string {
  if (typeof value !== "string") return "";
  const stripped = value
    .replace(/^\${1,2}/, "")
    .replace(/\${1,2}$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  if (!stripped || UNSAFE_LATEX.test(stripped)) return "";
  return stripped;
}

function normalizeNode(value: unknown): LessonDiagramNode | null {
  if (!isRecord(value)) return null;
  const id = cleanId(value.id);
  const label = cleanText(value.label, 60);
  if (!id || !label) return null;
  return {
    id,
    label,
    x: clampCoordinate(value.x),
    y: clampCoordinate(value.y),
  };
}

function normalizeVisual(value: unknown): LessonVisual | null {
  if (!isRecord(value)) return null;

  switch (value.kind) {
    case "title": {
      const text = cleanText(value.text, 90);
      if (!text) return null;
      const subtitle = cleanText(value.subtitle, 160);
      return subtitle
        ? { kind: "title", text, subtitle }
        : { kind: "title", text };
    }

    case "bullets": {
      const rawItems = Array.isArray(value.items) ? value.items : [];
      const items: string[] = [];
      for (const rawItem of rawItems) {
        const item = cleanText(rawItem, 160);
        if (item && !items.includes(item)) items.push(item);
        if (items.length >= 6) break;
      }
      if (items.length < 2) return null;
      return { kind: "bullets", items };
    }

    case "equation": {
      const latex = normalizeLatex(value.latex);
      if (!latex) return null;
      const caption = cleanText(value.caption, 160);
      return caption
        ? { kind: "equation", latex, caption }
        : { kind: "equation", latex };
    }

    case "diagram": {
      const rawNodes = Array.isArray(value.nodes) ? value.nodes : [];
      const nodes: LessonDiagramNode[] = [];
      const nodeIds = new Set<string>();
      for (const rawNode of rawNodes) {
        const node = normalizeNode(rawNode);
        if (node && !nodeIds.has(node.id)) {
          nodeIds.add(node.id);
          nodes.push(node);
        }
        if (nodes.length >= 6) break;
      }
      if (nodes.length < 2) return null;

      const rawEdges = Array.isArray(value.edges) ? value.edges : [];
      const edges: [string, string][] = [];
      const edgeKeys = new Set<string>();
      for (const rawEdge of rawEdges) {
        if (!Array.isArray(rawEdge) || rawEdge.length !== 2) continue;
        const from = cleanId(rawEdge[0]);
        const to = cleanId(rawEdge[1]);
        if (!from || !to || from === to) continue;
        if (!nodeIds.has(from) || !nodeIds.has(to)) continue;
        const key = `${from}->${to}`;
        if (edgeKeys.has(key)) continue;
        edgeKeys.add(key);
        edges.push([from, to]);
        if (edges.length >= 12) break;
      }

      const caption = cleanText(value.caption, 160);
      return caption
        ? { kind: "diagram", nodes, edges, caption }
        : { kind: "diagram", nodes, edges };
    }

    case "callout": {
      const text = cleanText(value.text, 220);
      if (!text) return null;
      const tone =
        value.tone === "tip" || value.tone === "warn" ? value.tone : "key";
      return { kind: "callout", tone, text };
    }

    default:
      return null;
  }
}

function normalizeReveal(value: unknown): LessonReveal {
  switch (value) {
    case "write":
    case "draw":
    case "none":
      return value;
    default:
      return "fade";
  }
}

function normalizeCheckpoint(value: unknown): LessonCheckpoint | undefined {
  if (!isRecord(value)) return undefined;
  const question = cleanText(value.question, 300);
  const rawOptions = Array.isArray(value.options) ? value.options : [];
  const options: string[] = [];
  for (const rawOption of rawOptions) {
    const option = cleanText(rawOption, 160);
    if (option) options.push(option);
    if (options.length >= 4) break;
  }
  if (!question || options.length < 2) return undefined;

  const correct =
    typeof value.correct === "number" ? Math.trunc(value.correct) : Number.NaN;
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
    return undefined;
  }

  return {
    question,
    options,
    correct,
    explanation: cleanText(value.explanation, 400),
  };
}

function normalizeSlide(value: unknown): NormalizedSlide | null {
  if (!isRecord(value)) return null;
  const visual = normalizeVisual(value.visual);
  if (!visual) return null;

  const narration = cleanText(value.narration, 1600);
  const words = wordCount(narration);
  if (words < MIN_NARRATION_WORDS || words > MAX_NARRATION_WORDS) return null;

  const checkpoint = normalizeCheckpoint(value.checkpoint);
  const slide: NormalizedSlide = {
    visual,
    narration,
    reveal: normalizeReveal(value.reveal),
  };
  if (checkpoint) slide.checkpoint = checkpoint;
  return slide;
}

export function normalizeLessonScript(raw: unknown): LessonScriptDraft {
  if (!isRecord(raw)) throw new LessonScriptValidationError();

  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
  const slides: NormalizedSlide[] = [];
  for (const rawSlide of rawSlides) {
    const slide = normalizeSlide(rawSlide);
    if (slide) slides.push(slide);
    if (slides.length >= MAX_SLIDES) break;
  }

  if (slides.length < MIN_SLIDES) throw new LessonScriptValidationError();

  let checkpointCount = 0;
  const finalSlides: LessonSlide[] = slides.map((slide, index) => {
    const normalized: LessonSlide = { ...slide, id: `s${index + 1}` };
    if (normalized.checkpoint) {
      checkpointCount += 1;
      if (checkpointCount > MAX_CHECKPOINTS) delete normalized.checkpoint;
    }
    return normalized;
  });

  return {
    title: cleanText(raw.title, 90) || "Lesson",
    slides: finalSlides,
  };
}

export function lessonSourceHash(
  title: string,
  content: string,
  context = "",
): string {
  const prefix = context.trim() ? `${context.trim()}\n` : "";
  const input = `${prefix}${title.trim()}\n${content.trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(16).padStart(8, "0")}-${input.length.toString(16)}`;
}
