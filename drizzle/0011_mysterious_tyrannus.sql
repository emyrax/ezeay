ALTER TABLE "users" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "grade" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "degree" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subjects" text DEFAULT '[]' NOT NULL;