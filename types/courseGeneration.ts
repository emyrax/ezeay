import type { Chapter, Quiz } from "./chapter";

export interface GenerateCourseInput {
  prompt: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  weeks?: number;
  creatorName?: string;
  creatorAvatar?: string;
  learningGoals?: string[];
  personalizationContext?: string;
}

export interface GenerateCourseResponse {
  courseTitle: string;
  courseDescription: string;
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    totalChapters: number;
    rewardXp: number;
    icon: string;
    creatorId: string;
    creatorName?: string;
    creatorAvatar?: string;
    chapters: Chapter[];
    thumbnailPrompt: string;
    thumbnailUrl?: string;
    createdAt: string;
  };
  chapters: Chapter[];
  thumbnailPrompt: string;
}

export interface GenerateQuizInput {
  courseId: string;
  courseTitle: string;
  chapterIndex: number;
  subtopicIndex: number;
  subtopicTitle: string;
}

export interface GenerateQuizResponse {
  quiz: Quiz;
}
