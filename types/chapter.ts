import type { ReelHookMeta } from "./community";

export interface Chapter {
  title: string;
  description: string;
  order: number;
  subtopics: Subtopic[];
  isPrivate?: boolean;
}

export interface Subtopic extends ReelHookMeta {
  title: string;
  content: string;
  order: number;
}

export interface Quiz {
  chapterIndex: number;
  subtopicIndex: number;
  questions: Question[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
