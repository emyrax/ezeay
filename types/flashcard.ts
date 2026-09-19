export type FlashcardSourceType = "material" | "note";

export interface Flashcard {
  id: string;
  sourceType: FlashcardSourceType;
  sourceId?: string | null;
  sourceTitle: string;
  front: string;
  back: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  createdAt: string;
  updatedAt?: string | null;
}

export type FlashcardQuality = 0 | 3 | 5;

export interface FlashcardReviewResult {
  id: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  awardedXp: number;
}

export interface FlashcardDeck {
  cards: Flashcard[];
  dueCount: number;
}