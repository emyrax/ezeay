CREATE TABLE "lesson_scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"chapter_index" integer NOT NULL,
	"subtopic_index" integer NOT NULL,
	"title" text NOT NULL,
	"script" jsonb NOT NULL,
	"audio" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"voice" text DEFAULT 'Kore' NOT NULL,
	"tts_model" text DEFAULT '' NOT NULL,
	"source_hash" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'script_ready' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "lesson_scripts_course_id_chapter_index_subtopic_index_unique" UNIQUE("course_id","chapter_index","subtopic_index")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audio" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"color" text,
	"source_note_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spin_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"spin_index" integer NOT NULL,
	"prize_id" text NOT NULL,
	"prize_type" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"reward_xp" integer DEFAULT 0 NOT NULL,
	"reward_coins" integer DEFAULT 0 NOT NULL,
	"consumes_spin" boolean DEFAULT true NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spin_claims_user_id_date_spin_index_unique" UNIQUE("user_id","date","spin_index")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_scripts" ADD CONSTRAINT "lesson_scripts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spin_claims" ADD CONSTRAINT "spin_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_scripts_course_idx" ON "lesson_scripts" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "notes_user_updated_idx" ON "notes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_user_source_idx" ON "notes" USING btree ("user_id","source_note_id");--> statement-breakpoint
CREATE INDEX "spin_claims_user_date_idx" ON "spin_claims" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "course_enrollments_user_updated_idx" ON "course_enrollments" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "study_materials_user_created_idx" ON "study_materials" USING btree ("user_id","created_at");