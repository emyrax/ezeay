CREATE TABLE "reel_challenge_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"chapter_index" integer NOT NULL,
	"subtopic_index" integer NOT NULL,
	"challenge_type" text DEFAULT 'multiple-choice' NOT NULL,
	"selected_index" integer NOT NULL,
	"correct" boolean DEFAULT false NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reel_challenge_attempts_user_id_course_id_chapter_index_subtopic_index_unique" UNIQUE("user_id","course_id","chapter_index","subtopic_index")
);
--> statement-breakpoint
CREATE TABLE "reel_daily_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"reels_viewed" integer DEFAULT 0 NOT NULL,
	"challenges_answered" integer DEFAULT 0 NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"goal_met" boolean DEFAULT false NOT NULL,
	"bonus_awarded" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reel_daily_progress_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "reel_challenge_attempts" ADD CONSTRAINT "reel_challenge_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_daily_progress" ADD CONSTRAINT "reel_daily_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reel_challenge_attempts_course_idx" ON "reel_challenge_attempts" USING btree ("course_id","chapter_index","subtopic_index");--> statement-breakpoint
CREATE INDEX "reel_daily_progress_user_date_idx" ON "reel_daily_progress" USING btree ("user_id","date");