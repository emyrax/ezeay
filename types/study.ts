export type StudySourceType = "camera" | "gallery" | "file" | "note";
export type StudyMaterialType = "image" | "pdf" | "doc" | "txt" | "timetable" | "audio";

export interface StudyQuiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface StudyBite {
  id: string;
  title: string;
  content: string;
  order: number;
  quizzes: StudyQuiz[];
}

export interface TimetableSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  location: string;
  color?: string;
}

export interface TimetableData {
  slots: TimetableSlot[];
}

export interface StudyMaterial {
  id: string;
  title: string;
  type: StudyMaterialType;
  sourceType: StudySourceType;
  fileUri?: string;
  thumbnailUrl?: string;
  extractedContent: string;
  summary?: string;
  bites: StudyBite[];
  timetable?: TimetableData;
  tags: string[];
  cheatsheet?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuizAttempt {
  id: string;
  materialId: string;
  materialTitle: string;
  correct: number;
  total: number;
  scorePct: number;
  awardedXp: number;
  createdAt: string;
}

export interface QuizResult {
  quizId: string;
  selectedAnswer: number;
  correct: boolean;
}

export interface StudySession {
  materialId: string;
  currentBiteIndex: number;
  quizResults: QuizResult[];
  completed: boolean;
}

export type StudySuggestionType =
  | "mnemonic"
  | "analogy"
  | "story"
  | "examTip"
  | "hook"
  | "connection";

export interface StudySuggestion {
  type: StudySuggestionType;
  title: string;
  body: string;
}
