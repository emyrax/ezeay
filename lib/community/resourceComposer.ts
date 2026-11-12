import type { ResourceType } from "../../types/community";

interface ResourceTypeInput {
  fileName?: string | null;
  mimeType?: string | null;
  hasFile: boolean;
  noteOnly?: boolean;
}

interface ResourceContent {
  title: string;
  summary: string;
  hook: string;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "aac", "ogg", "webm"]);

function extensionOf(fileName: string | null | undefined): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName ?? "");
  return match?.[1]?.toLowerCase() ?? "";
}

export function inferResourceType({
  fileName,
  mimeType,
  hasFile,
  noteOnly,
}: ResourceTypeInput): ResourceType {
  if (noteOnly || !hasFile) return "text";

  const mime = (mimeType ?? "").toLowerCase();
  const extension = extensionOf(fileName);

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }
  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (
    mime.startsWith("text/") ||
    ["txt", "md", "markdown"].includes(extension)
  ) {
    return "text";
  }
  return "other";
}

export function deriveResourceContent(
  caption: string,
  fileName?: string | null,
): ResourceContent {
  const normalized = caption.replace(/\s+/g, " ").trim();
  const fileTitle = (fileName ?? "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const firstSentence = (normalized.split(/(?<=[.!?])\s/)[0] ?? "").replace(
    /[.!?]+$/,
    "",
  );
  const titleSource = fileTitle || firstSentence || normalized || "Shared resource";
  const summarySource =
    normalized || (fileTitle ? `Shared ${fileTitle}` : "Shared a learning resource.");

  return {
    title: truncate(titleSource, 80),
    summary: truncate(summarySource, 300),
    hook: truncate(firstSentence || titleSource, 140),
  };
}

export function buildXIntentUrl(caption: string, url: string): string {
  const cleanCaption = caption.trim();
  const cleanUrl = url.trim();
  const text = cleanCaption ? `${cleanCaption}\n\n${cleanUrl}` : cleanUrl;
  const params = new URLSearchParams({ text });
  return `https://x.com/intent/post?${params.toString()}`;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
