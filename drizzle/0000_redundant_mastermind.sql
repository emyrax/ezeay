CREATE TABLE "levels" (
	"id" text PRIMARY KEY NOT NULL,
	"level_number" integer NOT NULL,
	"xp_required" integer NOT NULL,
	"rank_name" text NOT NULL,
	"coin_reward" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trophies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"condition_type" text NOT NULL,
	"condition_value" integer NOT NULL,
	"coin_reward" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT 'Scholar' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"organisation" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"major_course" text DEFAULT '' NOT NULL,
	"birthday" text,
	"status" text DEFAULT 'active' NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"coins" integer DEFAULT 0 NOT NULL,
	"gaming_level" integer DEFAULT 1 NOT NULL,
	"rank" text DEFAULT 'Spark' NOT NULL,
	"next_level_xp" integer DEFAULT 100 NOT NULL,
	"courses" text DEFAULT '[]' NOT NULL,
	"earned_trophies" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
