export const MAX_THREAD_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.floor(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function exceedsThreadAttachmentLimit(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > MAX_THREAD_ATTACHMENT_BYTES;
}
