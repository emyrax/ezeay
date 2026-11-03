export const MAX_THREAD_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const SUBTOPIC_POST_PREFIX = "subtopic:";
export const RESOURCE_POST_PREFIX = "resource:";

export type ThreadExamCategory = "WAEC" | "NECO" | "General";
export type ThreadMediaType = "video" | "visual_lesson" | "quiz" | "document";

export interface ParsedThreadPostId {
  kind: "subtopic" | "resource";
  courseId?: string;
  chapterIndex?: number;
  subtopicIndex?: number;
  resourceId?: string;
}

export interface BaseThreadItem {
  id: string;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  courseId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  subtopicIndex: number;
  partNumber: number;
  subtopicCount: number;
  subtopicTitle: string;
  content: string;
  examCategory: ThreadExamCategory;
  mediaType: ThreadMediaType;
  mediaUrl: string | null;
  attachments: { type: "image" | "pdf" | "document"; url: string; fileSizeMb: number }[];
  createdAt: string;
}

interface FacetLike {
  title?: unknown;
  content?: unknown;
  isPrivate?: unknown;
  subtopics?: unknown;
}

interface CourseLike {
  id: string;
  title: string;
  category: string | null;
  creatorId: string;
  creatorName: string | null;
  creatorAvatar: string | null;
  chapters: string | null;
  sharedAt: Date | string | null;
}

interface ResourceRowLike {
  id: string;
  userId: string;
  authorName: string | null;
  authorAvatar: string | null;
  body: string;
  createdAt: Date | string;
}

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

export function buildChapterId(courseId: string, chapterIndex: number): string {
  return `${courseId}:${chapterIndex}`;
}

export function parseChapterId(
  chapterId: string,
): { courseId: string; chapterIndex: number } | null {
  const splitAt = chapterId.lastIndexOf(":");
  if (splitAt <= 0) return null;
  const courseId = chapterId.slice(0, splitAt);
  const chapterIndex = Number(chapterId.slice(splitAt + 1));
  if (!courseId || !Number.isInteger(chapterIndex) || chapterIndex < 0) return null;
  return { courseId, chapterIndex };
}

export function buildSubtopicPostId(
  courseId: string,
  chapterIndex: number,
  subtopicIndex: number,
): string {
  return `${SUBTOPIC_POST_PREFIX}${courseId}:${chapterIndex}:${subtopicIndex}`;
}

export function buildResourcePostId(resourceId: string): string {
  return `${RESOURCE_POST_PREFIX}${resourceId}`;
}

export function parseThreadPostId(postId: string): ParsedThreadPostId | null {
  if (postId.startsWith(SUBTOPIC_POST_PREFIX)) {
    const rest = postId.slice(SUBTOPIC_POST_PREFIX.length);
    const parts = rest.split(":");
    if (parts.length < 3) return null;
    const subtopicRaw = parts.pop();
    const chapterRaw = parts.pop();
    const courseId = parts.join(":");
    const chapterIndex = Number(chapterRaw);
    const subtopicIndex = Number(subtopicRaw);
    if (
      !courseId ||
      !Number.isInteger(chapterIndex) ||
      !Number.isInteger(subtopicIndex) ||
      chapterIndex < 0 ||
      subtopicIndex < 0
    ) {
      return null;
    }
    return { kind: "subtopic", courseId, chapterIndex, subtopicIndex };
  }

  if (postId.startsWith(RESOURCE_POST_PREFIX)) {
    const resourceId = postId.slice(RESOURCE_POST_PREFIX.length);
    if (!resourceId) return null;
    return { kind: "resource", resourceId };
  }

  return null;
}

export function seededRank(seed: number | string, id: string): number {
  const numericSeed =
    typeof seed === "number" && Number.isFinite(seed)
      ? seed >>> 0
      : hashString(String(seed ?? ""));
  let hash = 2166136261 ^ numericSeed;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeSeed(raw: unknown): number {
  const parsed = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed) >>> 0;
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export function truncateText(value: unknown, max = 280): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function formatExamCategory(category: string | null | undefined): ThreadExamCategory {
  const normalized = (category ?? "").toUpperCase();
  if (normalized.includes("WAEC")) return "WAEC";
  if (normalized.includes("NECO")) return "NECO";
  return "General";
}

export function parseChapters(raw: string | null | undefined): FacetLike[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FacetLike[]) : [];
  } catch {
    return [];
  }
}

export function flattenChapterSubtopics(
  course: CourseLike,
  chapter: FacetLike,
  chapterIndex: number,
): BaseThreadItem[] {
  if (!course.sharedAt) return [];

  const createdAt =
    course.sharedAt instanceof Date ? course.sharedAt.toISOString() : String(course.sharedAt);
  const subtopics = Array.isArray(chapter?.subtopics) ? chapter.subtopics : [];
  const chapterTitle =
    typeof chapter?.title === "string" && chapter.title.trim()
      ? chapter.title.trim()
      : course.title;
  const subtopicCount = subtopics.length;

  return subtopics.map((subtopic, subtopicIndex) => {
    const sub = subtopic as FacetLike;
    const subtopicTitle =
      typeof sub?.title === "string" && sub.title.trim()
        ? sub.title.trim()
        : `Part ${subtopicIndex + 1}`;
    return {
      id: buildSubtopicPostId(course.id, chapterIndex, subtopicIndex),
      authorId: course.creatorId,
      authorName: course.creatorName,
      authorAvatar: course.creatorAvatar,
      courseId: course.id,
      chapterId: buildChapterId(course.id, chapterIndex),
      chapterIndex,
      chapterTitle,
      subtopicIndex,
      partNumber: subtopicIndex + 1,
      subtopicCount,
      subtopicTitle,
      content: truncateText(sub?.content),
      examCategory: formatExamCategory(course.category),
      mediaType: "visual_lesson" as const,
      mediaUrl: null,
      attachments: [],
      createdAt,
    };
  });
}

export function flattenCourseSubtopics(
  course: CourseLike,
  options: { viewerId: string; includeMine: boolean },
): BaseThreadItem[] {
  if (!options.includeMine && course.creatorId === options.viewerId) return [];
  if (!course.sharedAt) return [];

  const chapters = parseChapters(course.chapters);
  const items: BaseThreadItem[] = [];

  chapters.forEach((chapter, chapterIndex) => {
    if (chapter?.isPrivate && course.creatorId !== options.viewerId) return;
    items.push(...flattenChapterSubtopics(course, chapter, chapterIndex));
  });

  return items;
}

export function mapResourceToThreadItem(row: ResourceRowLike): BaseThreadItem | null {
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.body);
    data = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    data = { title: "Study Resource", summary: row.body };
  }

  const title =
    typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Study Resource";
  const summary =
    typeof data.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : typeof data.previewText === "string"
        ? data.previewText.trim()
        : "";

  const storageUrl = typeof data.storageUrl === "string" ? data.storageUrl.trim() : "";
  const fileSizeBytes =
    typeof data.fileSizeBytes === "number" && Number.isFinite(data.fileSizeBytes)
      ? Math.max(0, Math.floor(data.fileSizeBytes))
      : 0;
  const mimeType = typeof data.mimeType === "string" ? data.mimeType.toLowerCase() : "";
  const resourceType = typeof data.resourceType === "string" ? data.resourceType : "other";

  const attachments: BaseThreadItem["attachments"] = [];
  if (storageUrl && fileSizeBytes > 0 && fileSizeBytes <= MAX_THREAD_ATTACHMENT_BYTES) {
    const attachmentType =
      mimeType.startsWith("image/") || resourceType === "image" || resourceType === "handwritten"
        ? "image"
        : mimeType === "application/pdf" || resourceType === "pdf"
          ? "pdf"
          : "document";
    attachments.push({
      type: attachmentType,
      url: storageUrl,
      fileSizeMb: Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100,
    });
  }

  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);

  return {
    id: buildResourcePostId(row.id),
    authorId: row.userId,
    authorName: row.authorName,
    authorAvatar: row.authorAvatar,
    courseId: row.id,
    chapterId: `resource:${row.id}`,
    chapterIndex: 0,
    chapterTitle: title,
    subtopicIndex: 0,
    partNumber: 1,
    subtopicCount: 1,
    subtopicTitle: title,
    content: truncateText(summary),
    examCategory: "General",
    mediaType: "document",
    mediaUrl: storageUrl || null,
    attachments,
    createdAt,
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
