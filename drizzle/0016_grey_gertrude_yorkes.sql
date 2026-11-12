CREATE TABLE "agent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text DEFAULT 'school-outline' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"persona" text DEFAULT 'custom' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutor_preferences" ALTER COLUMN "exam_type" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "tutor_conversations" ADD COLUMN "agent_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_profiles_user_updated_idx" ON "agent_profiles" USING btree ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "tutor_conversations" ADD CONSTRAINT "tutor_conversations_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "tutor_preferences" SET "persona" = 'exam_examiner' WHERE "persona" = 'waec_examiner';--> statement-breakpoint
UPDATE "agent_profiles" SET "persona" = 'exam_examiner' WHERE "persona" = 'waec_examiner';--> statement-breakpoint
UPDATE "tutor_conversations" SET "persona" = 'exam_examiner' WHERE "persona" = 'waec_examiner';