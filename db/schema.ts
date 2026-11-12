import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  doublePrecision,
  unique,
  real,
  vector,
  index,
  uniqueIndex,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import type { AudioClip, NoteImage } from "../types/note";
import type { LessonAudioClip, LessonScriptDraft } from "../types/lesson";
import type { TutorCitation, TutorMessageAttachment } from "../types/tutor";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default("Scholar"),
  email: text("email").notNull().default(""),
  photoUrl: text("photo_url"),
  level: text("level").notNull().default(""),
  majorCourse: text("major_course").notNull().default(""),
  birthday: text("birthday"),
  educationLevel: text("education_level"),
  country: text("country"),
  region: text("region"),
  schoolType: text("school_type"),
  school: text("school"),
  grade: text("grade"),
  degree: text("degree"),
  subjects: text("subjects").notNull().default("[]"),
  professionalInfoEnabled: boolean("professional_info_enabled").notNull().default(true),
  status: text("status").notNull().default("active"),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  gamingLevel: integer("gaming_level").notNull().default(1),
  rank: text("rank").notNull().default("Spark"),
  nextLevelXp: integer("next_level_xp").notNull().default(100),
  courses: text("courses").notNull().default("[]"),
  earnedTrophies: text("earned_trophies").notNull().default("[]"),

  // Check-in / streak fields
  lastCheckInDate: text("last_check_in_date"),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),

  // Extended profile fields
  headline: text("headline"),
  bio: text("bio"),
  location: text("location"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  university: text("university"),
  website: text("website"),
  linkedInUrl: text("linked_in_url"),
  department: text("department"),
  collarType: text("collar_type"),
  availability: text("availability"),
  industry: text("industry"),
  jobTitle: text("job_title"),
  company: text("company"),

  // JSON arrays/objects stored as text
  education: text("education").notNull().default("[]"),
  workExperience: text("work_experience").notNull().default("[]"),
  tradeSkills: text("trade_skills").notNull().default("[]"),
  certifications: text("certifications").notNull().default("[]"),
  yearsOfTradeExperience: integer("years_of_trade_experience"),
  skills: text("skills").notNull().default("[]"),
  languages: text("languages").notNull().default("[]"),
  interests: text("interests").notNull().default("[]"),
  learningGoals: text("learning_goals").notNull().default("[]"),
  onBoarded: boolean("on_boarded").notNull().default(false),
  modelRatings: text("model_ratings").notNull().default("{}"),
  isPro: boolean("is_pro").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const levels = pgTable("levels", {
  id: text("id").primaryKey(),
  levelNumber: integer("level_number").notNull(),
  xpRequired: integer("xp_required").notNull(),
  rankName: text("rank_name").notNull(),
  coinReward: integer("coin_reward").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trophies = pgTable("trophies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  conditionType: text("condition_type").notNull(),
  conditionValue: integer("condition_value").notNull(),
  coinReward: integer("coin_reward").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default(""),
  difficulty: text("difficulty").notNull().default("Beginner"),
  totalChapters: integer("total_chapters").notNull().default(0),
  rewardXp: integer("reward_xp").notNull().default(0),
  icon: text("icon").notNull().default("book"),
  creatorId: text("creator_id")
    .notNull()
    .default("system")
    .references(() => users.id, { onDelete: "set null" }),
  creatorName: text("creator_name"),
  creatorAvatar: text("creator_avatar"),
  chapters: text("chapters").notNull().default("[]"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailPrompt: text("thumbnail_prompt"),
  pinned: boolean("pinned").notNull().default(false),
  favorite: boolean("favorite").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(false),
  sharedAt: timestamp("shared_at", { withTimezone: true }),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    currentChapter: integer("current_chapter").notNull().default(0),
    progress: doublePrecision("progress").notNull().default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
    progressDetails: text("progress_details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueEnrollment: unique().on(table.userId, table.courseId),
    enrollmentUserUpdatedIdx: index("course_enrollments_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const lessonScripts = pgTable(
  "lesson_scripts",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    chapterIndex: integer("chapter_index").notNull(),
    subtopicIndex: integer("subtopic_index").notNull(),
    title: text("title").notNull(),
    script: jsonb("script").$type<LessonScriptDraft>().notNull(),
    audio: jsonb("audio").$type<LessonAudioClip[]>().notNull().default([]),
    voice: text("voice").notNull().default("Kore"),
    ttsModel: text("tts_model").notNull().default(""),
    sourceHash: text("source_hash").notNull().default(""),
    status: text("status").notNull().default("script_ready"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueLesson: unique().on(
      table.courseId,
      table.chapterIndex,
      table.subtopicIndex,
    ),
    lessonCourseIdx: index("lesson_scripts_course_idx").on(table.courseId),
  }),
);

export const studyMaterials = pgTable("study_materials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  sourceType: text("source_type").notNull(),
  fileUri: text("file_uri"),
  thumbnailUrl: text("thumbnail_url"),
  extractedContent: text("extracted_content").notNull().default(""),
  summary: text("summary"),
  bites: text("bites").notNull().default("[]"),
  timetable: text("timetable"),
  tags: text("tags").notNull().default("[]"),
  cheatsheet: text("cheatsheet"),
  examBoard: text("exam_board"),
  examYear: integer("exam_year"),
  paperCode: text("paper_code"),
  paperType: text("paper_type"),
  durationMinutes: integer("duration_minutes"),
  isPastPaper: boolean("is_past_paper").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => ({
  studyMaterialsUserCreatedIdx: index("study_materials_user_created_idx").on(
    table.userId,
    table.createdAt,
  ),
}));

export const studyFlashcards = pgTable("study_flashcards", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  sourceTitle: text("source_title").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  intervalDays: integer("interval_days").notNull().default(0),
  ease: real("ease").notNull().default(2.5),
  repetitions: integer("repetitions").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => studyMaterials.id, { onDelete: "cascade" }),
  correct: integer("correct").notNull().default(0),
  total: integer("total").notNull().default(0),
  scorePct: integer("score_pct").notNull().default(0),
  awardedXp: integer("awarded_xp").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueChunk: unique().on(table.userId, table.sourceType, table.sourceId, table.chunkIndex),
  }),
);

export const userTrophies = pgTable(
  "user_trophies",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trophyId: text("trophy_id")
      .notNull()
      .references(() => trophies.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueTrophy: unique().on(table.userId, table.trophyId),
  }),
);

export const noteChats = pgTable(
  "note_chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    noteId: text("note_id").notNull(),
    role: text("role").notNull(),
    kind: text("kind").notNull().default("chat"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userNoteIdx: index("note_chats_user_note_idx").on(table.userId, table.noteId),
  }),
);

export const bountyClaims = pgTable(
  "bounty_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bountyId: text("bounty_id").notNull(),
    title: text("title").notNull().default(""),
    rewardXp: integer("reward_xp").notNull().default(0),
    rewardCoins: integer("reward_coins").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    date: text("date").notNull(),
  },
  (table) => ({
    uniqueBountyClaim: unique().on(table.userId, table.bountyId),
    claimsByUserDate: index("bounty_claims_user_date_idx").on(table.userId, table.date),
  }),
);

export const spinClaims = pgTable(
  "spin_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    spinIndex: integer("spin_index").notNull(),
    prizeId: text("prize_id").notNull(),
    prizeType: text("prize_type").notNull(),
    label: text("label").notNull().default(""),
    rewardXp: integer("reward_xp").notNull().default(0),
    rewardCoins: integer("reward_coins").notNull().default(0),
    consumesSpin: boolean("consumes_spin").notNull().default(true),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueSpinIndex: unique().on(table.userId, table.date, table.spinIndex),
    spinsByUserDate: index("spin_claims_user_date_idx").on(table.userId, table.date),
  }),
);

export const userDailyActivity = pgTable(
  "user_daily_activity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserDate: unique().on(table.userId, table.date),
    activityUserIdx: index("user_daily_activity_user_idx").on(table.userId, table.date),
  }),
);

export const communityPosts = pgTable(
  "community_posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    challengeType: text("challenge_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    communityPostCreatedIdx: index("community_posts_created_idx").on(table.createdAt),
  }),
);

export const communityPostReactions = pgTable(
  "community_post_reactions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull().default("like"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueReaction: unique().on(table.postId, table.userId),
  }),
);

export const communityPostComments = pgTable(
  "community_post_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    communityCommentPostIdx: index("community_comments_post_idx").on(table.postId),
  }),
);

export const reelChallengeAttempts = pgTable(
  "reel_challenge_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    chapterIndex: integer("chapter_index").notNull(),
    subtopicIndex: integer("subtopic_index").notNull(),
    challengeType: text("challenge_type").notNull().default("multiple-choice"),
    selectedIndex: integer("selected_index").notNull(),
    correct: boolean("correct").notNull().default(false),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueReelAttempt: unique().on(
      table.userId,
      table.courseId,
      table.chapterIndex,
      table.subtopicIndex,
    ),
    reelAttemptCourseIdx: index("reel_challenge_attempts_course_idx").on(
      table.courseId,
      table.chapterIndex,
      table.subtopicIndex,
    ),
  }),
);

export const reelDailyProgress = pgTable(
  "reel_daily_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    reelsViewed: integer("reels_viewed").notNull().default(0),
    challengesAnswered: integer("challenges_answered").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    goalMet: boolean("goal_met").notNull().default(false),
    bonusAwarded: boolean("bonus_awarded").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueReelDaily: unique().on(table.userId, table.date),
    reelDailyUserDateIdx: index("reel_daily_progress_user_date_idx").on(
      table.userId,
      table.date,
    ),
  }),
);

export const courseFeedLikes = pgTable(
  "course_feed_likes",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    courseFeedLikeUnique: unique().on(table.courseId, table.userId),
    courseFeedLikeCourseIdx: index("course_feed_likes_course_idx").on(table.courseId),
  }),
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    images: jsonb("images").$type<NoteImage[]>().notNull().default([]),
    audio: jsonb("audio").$type<AudioClip[]>().notNull().default([]),
    pinned: boolean("pinned").notNull().default(false),
    color: text("color"),
    sourceNoteId: text("source_note_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    notesUserUpdatedIdx: index("notes_user_updated_idx").on(table.userId, table.updatedAt),
    notesUserSourceIdx: uniqueIndex("notes_user_source_idx").on(table.userId, table.sourceNoteId),
  }),
);

export const userFollows = pgTable(
  "user_follows",
  {
    id: text("id").primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueFollow: unique().on(table.followerId, table.followingId),
    followFollowingIdx: index("user_follows_following_idx").on(table.followingId),
  }),
);

export const userChallenges = pgTable(
  "user_challenges",
  {
    id: text("id").primaryKey(),
    challengerId: text("challenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengedUserId: text("challenged_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueChallenge: unique().on(table.challengerId, table.challengedUserId),
    challengeChallengedIdx: index("user_challenges_challenged_idx").on(table.challengedUserId),
  }),
);

export const threadPostLikes = pgTable(
  "thread_post_likes",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueThreadLike: unique().on(table.postId, table.userId),
    threadLikePostIdx: index("thread_post_likes_post_idx").on(table.postId),
  }),
);

export const threadPostComments = pgTable(
  "thread_post_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadCommentPostIdx: index("thread_post_comments_post_idx").on(table.postId),
  }),
);

export const agentProfiles = pgTable(
  "agent_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatar: text("avatar").notNull().default("school-outline"),
    instructions: text("instructions").notNull().default(""),
    persona: text("persona").notNull().default("custom"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentProfilesUserUpdatedIdx: index("agent_profiles_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const tutorConversations = pgTable(
  "tutor_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentProfileId: uuid("agent_profile_id").references(() => agentProfiles.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull().default("New chat"),
    persona: text("persona").notNull().default("patient_tutor"),
    mode: text("mode").notNull().default("materials"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tutorConversationsUserUpdatedIdx: index("tutor_conversations_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const tutorMessages = pgTable(
  "tutor_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => tutorConversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    kind: text("kind").notNull().default("chat"),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<TutorCitation[]>().notNull().default([]),
    attachments: jsonb("attachments")
      .$type<TutorMessageAttachment[]>()
      .notNull()
      .default([]),
    model: text("model"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tutorMessagesConversationCreatedIdx: index("tutor_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    tutorMessagesUserCreatedIdx: index("tutor_messages_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const tutorPreferences = pgTable("tutor_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  persona: text("persona").notNull().default("patient_tutor"),
  instructions: text("instructions").notNull().default(""),
  examType: text("exam_type").notNull().default(""),
  examDate: text("exam_date"),
  locale: text("locale").notNull().default("en-NG"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  dailyMessageLimit: integer("daily_message_limit").notNull().default(30),
  dailyToolLimit: integer("daily_tool_limit").notNull().default(20),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentMemories = pgTable(
  "agent_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("fact"),
    content: text("content").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileUrl: text("file_url"),
    sizeBytes: integer("size_bytes"),
    extractedText: text("extracted_text"),
    sourceConversationId: uuid("source_conversation_id").references(
      () => tutorConversations.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentMemoriesUserUpdatedIdx: index("agent_memories_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const agentIntegrations = pgTable(
  "agent_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toolkit: text("toolkit").notNull(),
    connectedAccountId: text("connected_account_id"),
    sessionId: text("session_id"),
    status: text("status").notNull().default("disconnected"),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentIntegrationsUserToolkitIdx: uniqueIndex("agent_integrations_user_toolkit_idx").on(
      table.userId,
      table.toolkit,
    ),
  }),
);

export const agentRoutines = pgTable(
  "agent_routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    scheduleCron: text("schedule_cron").notNull().default("0 7 * * *"),
    timezone: text("timezone").notNull().default("Africa/Lagos"),
    toolScopes: jsonb("tool_scopes").$type<string[]>().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastResult: text("last_result"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentRoutinesUserEnabledIdx: index("agent_routines_user_enabled_idx").on(
      table.userId,
      table.enabled,
    ),
    agentRoutinesNextRunIdx: index("agent_routines_next_run_idx").on(table.nextRunAt),
  }),
);

export const agentRoutineRuns = pgTable(
  "agent_routine_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => agentRoutines.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    output: text("output"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentRoutineRunsUserCreatedIdx: index("agent_routine_runs_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    agentRoutineRunsRoutineCreatedIdx: index("agent_routine_runs_routine_created_idx").on(
      table.routineId,
      table.createdAt,
    ),
  }),
);

export const agentToolRuns = pgTable(
  "agent_tool_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(
      () => tutorConversations.id,
      { onDelete: "set null" },
    ),
    messageId: uuid("message_id").references(() => tutorMessages.id, {
      onDelete: "set null",
    }),
    tool: text("tool").notNull(),
    args: jsonb("args").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    status: text("status").notNull().default("pending"),
    approval: text("approval").notNull().default("auto"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentToolRunsUserCreatedIdx: index("agent_tool_runs_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    agentToolRunsConversationCreatedIdx: index("agent_tool_runs_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  }),
);

export const agentPracticeAttempts = pgTable(
  "agent_practice_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: text("material_id").references(() => studyMaterials.id, {
      onDelete: "cascade",
    }),
    topic: text("topic"),
    examBoard: text("exam_board"),
    examYear: integer("exam_year"),
    correct: integer("correct").notNull().default(0),
    total: integer("total").notNull().default(0),
    scorePct: integer("score_pct").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    awardedXp: integer("awarded_xp").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentPracticeAttemptsIdempotencyIdx: uniqueIndex(
      "agent_practice_attempts_idempotency_idx",
    ).on(table.userId, table.idempotencyKey),
    agentPracticeAttemptsUserCreatedIdx: index("agent_practice_attempts_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const agentSyllabusProgress = pgTable(
  "agent_syllabus_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    examCode: text("exam_code").notNull(),
    subject: text("subject").notNull(),
    topicId: text("topic_id").notNull(),
    status: text("status").notNull().default("not_started"),
    confidence: integer("confidence").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentSyllabusProgressUnique: uniqueIndex("agent_syllabus_progress_unique_idx").on(
      table.userId,
      table.examCode,
      table.subject,
      table.topicId,
    ),
    agentSyllabusProgressUserExamIdx: index("agent_syllabus_progress_user_exam_idx").on(
      table.userId,
      table.examCode,
    ),
  }),
);