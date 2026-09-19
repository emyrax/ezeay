ALTER TABLE "users" DROP COLUMN "organisation";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "education_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "professional_info_enabled" boolean DEFAULT true NOT NULL;