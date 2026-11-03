export type VisualLessonMiniTone = "loading" | "ready" | "error" | "complete";

export interface VisualLessonMiniState {
  tone: VisualLessonMiniTone;
  title: string;
  detail: string;
}

interface VisualLessonMiniInput {
  loading: boolean;
  building: boolean;
  loadError: string | null;
  hasSlide: boolean;
  finished: boolean;
  buildStatus?: string;
}

export function getVisualLessonMiniState({
  loading,
  building,
  loadError,
  hasSlide,
  finished,
  buildStatus,
}: VisualLessonMiniInput): VisualLessonMiniState {
  if (loadError) {
    return {
      tone: "error",
      title: "Lesson couldn't load",
      detail: "Tap to retry",
    };
  }

  if (loading || building) {
    return {
      tone: "loading",
      title: building ? "Building lesson" : "Opening lesson",
      detail: buildStatus ?? "Working in the background",
    };
  }

  if (finished) {
    return {
      tone: "complete",
      title: "Lesson completed",
      detail: "Tap to review",
    };
  }

  if (hasSlide) {
    return {
      tone: "ready",
      title: "Lesson ready",
      detail: "Tap to continue",
    };
  }

  return {
    tone: "loading",
    title: "Lesson loading",
    detail: "Tap to check progress",
  };
}
