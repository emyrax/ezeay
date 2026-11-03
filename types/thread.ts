export type ExamCategory = "WAEC" | "NECO" | "General";

export type ThreadMediaType = "video" | "visual_lesson" | "quiz" | "document";

export interface ThreadUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  handle: string;
  bio: string | null;
  iqScore: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isChallenged: boolean;
}

export interface ThreadAttachment {
  type: "image" | "pdf" | "document";
  url: string;
  fileSizeMb: number;
}

export interface ThreadComment {
  id: string;
  body: string;
  createdAt: string;
  author: ThreadUser;
}

export interface SubtopicThreadPost {
  id: string;
  authorId: string;
  author: ThreadUser;
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  subtopicIndex: number;
  partNumber: number;
  subtopicCount: number;
  subtopicTitle: string;
  subtopicDetails: string;
  content: string;
  examCategory: ExamCategory;
  mediaType: ThreadMediaType;
  mediaUrl: string | null;
  attachments: ThreadAttachment[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

export type ThreadPost = SubtopicThreadPost;

export interface ThreadFeedPage {
  items: ThreadPost[];
  seed: number;
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  refreshedAt: string;
}

export interface ChapterThreadResponse {
  items: ThreadPost[];
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  refreshedAt: string;
}

export interface ThreadProfileResponse {
  user: ThreadUser;
}

export interface ThreadCommentListResponse {
  comments: ThreadComment[];
}

export interface ThreadFollowResponse {
  following: boolean;
  followersCount: number;
}

export interface ThreadChallengeResponse {
  challenged: boolean;
  challengeId: string;
}

export interface ThreadLikeResponse {
  liked: boolean;
  likesCount: number;
}
