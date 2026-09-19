export interface CommunityLeader {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  xp: number;
  gamingLevel: number;
  rank: string;
  currentStreak: number;
}

export interface CommunityOverview {
  leaderboard: CommunityLeader[];
  topStreaks: CommunityLeader[];
  me: {
    rank: number;
    learnerCount: number;
  };
  totals: {
    learners: number;
    totalXp: number;
    notesShared: number;
    activeToday: number;
  };
  refreshedAt: string;
}

export type CommunityFeedKind = "challenge" | "win" | "note" | "member";

export interface CommunityReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface CommunityFeedItem {
  id: string;
  kind: CommunityFeedKind;
  actor?: CommunityLeader;
  message: string;
  sub?: string;
  createdAt: number;
  reactions: CommunityReaction[];
  commentCount: number;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  target: number;
  progress: number;
}

export interface FeedSubtopic {
  title: string;
  order: number;
}

export interface FeedChapter {
  title: string;
  order: number;
  subtopics: FeedSubtopic[];
}

export interface CommunityFeedPost {
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
  thumbnailUrl?: string;
  sharedAt: string;
  chapterIndex: FeedChapter[];
}

export interface CommunityFeed {
  posts: CommunityFeedPost[];
  refreshedAt: string;
}

export interface UserComment {
  author: string;
  text: string;
}

export interface CommunityPostAuthor {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface CommunityPostComment {
  id: string;
  body: string;
  createdAt: string;
  author: CommunityPostAuthor;
}

export interface CommunityPost {
  id: string;
  body: string;
  challengeType: string | null;
  createdAt: string;
  author: CommunityPostAuthor;
  reactionCounts: Record<string, number>;
  myReaction: string | null;
  commentCount: number;
  comments: CommunityPostComment[];
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
}