export type QuizStatus =
  | "unattempted"
  | "generating"
  | "ready"
  | "passed"
  | "failed";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface FocusSubtopic {
  id: string;
  postId: string;
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  subtopicIndex: number;
  partNumber: number;
  subtopicCount: number;
  subtopicTitle: string;
  summary: string;
  addedAt: string;
}

export interface ThreadQuizSession {
  status: "idle" | "generating" | "ready";
  questions: QuizQuestion[];
  attempted: boolean;
  lastScore: number | null;
  generatedAt: string | null;
  error: string | null;
}
