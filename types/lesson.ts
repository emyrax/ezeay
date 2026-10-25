export interface LessonDiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export type LessonVisual =
  | { kind: "title"; text: string; subtitle?: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "equation"; latex: string; svg?: string; caption?: string }
  | {
      kind: "diagram";
      nodes: LessonDiagramNode[];
      edges: [string, string][];
      caption?: string;
    }
  | { kind: "callout"; tone: "key" | "tip" | "warn"; text: string };

export type LessonReveal = "write" | "fade" | "draw" | "none";

export interface LessonCheckpoint {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface LessonSlide {
  id: string;
  visual: LessonVisual;
  narration: string;
  reveal: LessonReveal;
  checkpoint?: LessonCheckpoint;
}

export interface LessonScriptDraft {
  title: string;
  slides: LessonSlide[];
}

export interface LessonAudioClip {
  slideId: string;
  url: string;
  durationMs: number;
  mimeType?: string;
}

export type LessonStatus = "script_ready" | "audio_ready" | "failed";

export interface LessonScript {
  id: string;
  courseId: string;
  chapterIndex: number;
  subtopicIndex: number;
  title: string;
  slides: LessonSlide[];
  audio: LessonAudioClip[];
  voice: string;
  ttsModel: string;
  sourceHash: string;
  status: LessonStatus;
  version: number;
  createdAt: string;
  updatedAt?: string | null;
  audioError?: string;
}

export type LessonExplainAction = "simplify" | "example" | "why";

export interface LessonExplainResponse {
  text: string;
}
