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

// ─── Reel retention metadata ───────────────────────────────────────────────────
export type ReelHookTone = "curious" | "challenge" | "misconception" | "fast-win";
export type ReelChallengeType =
  | "prediction"
  | "vote"
  | "multiple-choice"
  | "misconception";

export interface ReelHookMeta {
  hook?: string;
  hookTone?: ReelHookTone;
  challengeType?: ReelChallengeType;
  challengePrompt?: string;
  challengeOptions?: string[];
  correctChoiceIndex?: number;
  revealText?: string;
  shareCopy?: string;
  xpReward?: number;
  streakReward?: number;
}

export interface FeedSubtopic extends ReelHookMeta {
  title: string;
  order: number;
}

export interface FeedChapter {
  title: string;
  order: number;
  isPrivate?: boolean;
  subtopics: FeedSubtopic[];
}

// ─── Resource upload post ──────────────────────────────────────────────────────
export type ResourceType = "handwritten" | "pdf" | "text" | "image" | "audio" | "other";

export interface ExploreResourcePost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  type: "resource";
  title: string;
  summary: string;
  hook: string;
  hookTone?: ReelHookTone;
  challengeType: ReelChallengeType;
  challengePrompt: string;
  challengeOptions: string[];
  correctChoiceIndex?: number;
  revealText: string;
  shareCopy: string;
  resourceType: ResourceType;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageUrl: string;
  previewUrl?: string;
  previewText?: string;
  isPublic: boolean;
  tags: string[];
  likes: number;
  saves: number;
  shares: number;
  views: number;
  difficulty?: string;
  xpReward?: number;
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
  isMine: boolean;
  likeCount: number;
  likedByMe: boolean;
  viewCount: number;
  chapterIndex: FeedChapter[];
  /** Populated for resource posts from ExploreResourcePost */
  resourcePost?: ExploreResourcePost;
}

export interface CommunityFeed {
  posts: CommunityFeedPost[];
  refreshedAt: string;
  hasMore?: boolean;
  nextCursor?: string | null;
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
