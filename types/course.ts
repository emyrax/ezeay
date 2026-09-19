import type { Chapter } from "./chapter";

export interface Course {
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
  chapters?: Chapter[];
  thumbnailUrl?: string;
  thumbnailPrompt?: string;
  pinned?: boolean;
  favorite?: boolean;
  isPublic?: boolean;
  sharedAt?: string;
  progress?: number;
  completedModules?: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
