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
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default("Scholar"),
  email: text("email").notNull().default(""),
  photoUrl: text("photo_url"),
  level: text("level").notNull().default(""),
  majorCourse: text("major_course").notNull().default(""),
  birthday: text("birthday"),
  educationLevel: text("education_level"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

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
