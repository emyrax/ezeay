export function formatCount(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (safe < 1000) return String(safe);
  if (safe < 1_000_000) {
    const thousands = safe / 1000;
    return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const millions = safe / 1_000_000;
  return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}m`;
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function threadLessonHref(
  post: { courseId: string; chapterIndex: number; subtopicIndex: number },
): string {
  return `/course/${post.courseId}/lesson/${post.chapterIndex}/${post.subtopicIndex}`;
}

export function chapterDisplayNumber(chapterIndex: number): number {
  return Number.isFinite(chapterIndex) ? chapterIndex + 1 : 1;
}
