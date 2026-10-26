import type { LessonAudioClip, LessonSlide } from "../../types/lesson";

export function clampSlideIndex(index: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.round(index)), total - 1);
}

export function hasAudioForSlide(
  audio: readonly LessonAudioClip[],
  slideId: string,
): boolean {
  return audio.some((clip) => clip.slideId === slideId && !!clip.url);
}

export function findAudioClip(
  audio: readonly LessonAudioClip[],
  slideId: string,
): LessonAudioClip | null {
  return audio.find((clip) => clip.slideId === slideId && !!clip.url) ?? null;
}

export function isAudioComplete(
  slides: readonly Pick<LessonSlide, "id">[],
  audio: readonly LessonAudioClip[],
): boolean {
  return (
    slides.length > 0 && slides.every((slide) => hasAudioForSlide(audio, slide.id))
  );
}

export function formatTimecode(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function splitNarrationSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const matches = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!matches) return [trimmed];

  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

export interface NarrationWordTiming {
  word: string;
  start: number;
  end: number;
}

export function splitNarrationWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function wordWeight(word: string): number {
  const letters = word.replace(/[^a-zA-Z0-9]/g, "").length;
  let pause = 0;

  if (/[.!?]$/.test(word)) pause = 2.2;
  else if (/[;:]$/.test(word)) pause = 1.2;
  else if (/,$/.test(word)) pause = 0.8;

  return 1 + letters * 0.12 + pause;
}

export function buildNarrationWordTimings(
  text: string,
): NarrationWordTiming[] {
  const words = splitNarrationWords(text);
  if (words.length === 0) return [];

  const weights = words.map(wordWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return [];

  let elapsed = 0;
  return words.map((word, index) => {
    const start = elapsed / total;
    elapsed += weights[index];
    const end = index === words.length - 1 ? 1 : elapsed / total;
    return { word, start, end };
  });
}

export function activeNarrationWordIndex(
  timings: readonly NarrationWordTiming[],
  progress: number,
): number {
  if (timings.length === 0) return -1;

  const clamped = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  if (clamped >= 1) return timings.length - 1;

  let active = 0;
  for (let index = 0; index < timings.length; index += 1) {
    if (clamped >= timings[index].start) active = index;
    else break;
  }
  return active;
}

export function estimateNarrationDurationMs(text: string): number {
  const words = splitNarrationWords(text).length;
  if (words === 0) return 0;
  const punctuation = (text.match(/[.!?;:,]/g) ?? []).length;
  return Math.round(Math.max(2400, words * 330 + punctuation * 120));
}

export interface NarrationScrollMetrics {
  wordTop: number;
  wordHeight: number;
  scrollOffset: number;
  viewportHeight: number;
  contentHeight: number;
}

export function narrationScrollTarget({
  wordTop,
  wordHeight,
  scrollOffset,
  viewportHeight,
  contentHeight,
}: NarrationScrollMetrics): number | null {
  if (
    !Number.isFinite(wordTop) ||
    !Number.isFinite(wordHeight) ||
    !Number.isFinite(scrollOffset) ||
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(contentHeight) ||
    wordHeight <= 0 ||
    viewportHeight <= 0
  ) {
    return null;
  }

  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (maxScroll <= 0) return null;

  const safeTop = scrollOffset + viewportHeight * 0.26;
  const safeBottom = scrollOffset + viewportHeight * 0.66;
  const wordBottom = wordTop + wordHeight;
  if (wordTop >= safeTop && wordBottom <= safeBottom) return null;

  const target = Math.min(
    maxScroll,
    Math.max(0, wordTop - viewportHeight * 0.38),
  );
  if (Math.abs(target - scrollOffset) < 6) return null;
  return Math.round(target);
}

export function activeNarrationSentenceIndex(
  sentences: readonly string[],
  progress: number,
): number {
  if (sentences.length === 0) return -1;

  const clamped = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;

  if (clamped >= 1) return sentences.length - 1;

  const totalLength = sentences.reduce(
    (total, sentence) => total + sentence.length,
    0,
  );
  if (totalLength <= 0) return 0;

  const target = clamped * totalLength;
  let consumed = 0;

  for (let index = 0; index < sentences.length; index += 1) {
    consumed += sentences[index].length;
    if (target < consumed) return index;
  }

  return sentences.length - 1;
}

export type NarrationEnd = "checkpoint" | "advance" | "finish";

export function narrationEndAction(
  slide: Pick<LessonSlide, "checkpoint">,
  isLast: boolean,
): NarrationEnd {
  if (slide.checkpoint) return "checkpoint";
  return isLast ? "finish" : "advance";
}

export function prepareEquationSvg(svg: string, color: string): string {
  const normalizedColor = color.trim() || "#000000";
  return svg
    .replace(/<svg\b([^>]*)>/, (match, attributes: string) => {
      const cleaned = attributes
        .replace(/\swidth="[^"]*"/, "")
        .replace(/\sheight="[^"]*"/, "")
        .replace(/\sstyle="[^"]*"/, "")
        .replace(/\srole="[^"]*"/, "")
        .replace(/\sfocusable="[^"]*"/, "");
      return `<svg${cleaned}>`;
    })
    .replace(/currentColor/g, () => normalizedColor);
}

export function equationAspectRatio(svg: string): number | null {
  const match = /viewBox="([^"]+)"/.exec(svg);
  if (!match) return null;
  const parts = match[1]
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const width = parts[2];
  const height = parts[3];
  if (width <= 0 || height <= 0) return null;
  return width / height;
}
