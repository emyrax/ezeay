export interface Chapter {
  title: string;
  description: string;
  order: number;
  subtopics: Subtopic[];
}

export interface Subtopic {
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
  text: string;
  options: string[];
  correctAnswer: number;
}
