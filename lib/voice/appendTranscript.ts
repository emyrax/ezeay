export function appendTranscript(existing: string, transcript: string): string {
  const next = transcript.trim();
  if (!next) return existing;
  if (!existing.trim()) return next;
  if (/\s$/.test(existing)) return `${existing}${next}`;
  return `${existing} ${next}`;
}
