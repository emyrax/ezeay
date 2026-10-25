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
