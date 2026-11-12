CREATE TABLE "agent_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"toolkit" text NOT NULL,
	"connected_account_id" text,
	"session_id" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'fact' NOT NULL,
	"content" text NOT NULL,
	"source_conversation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_practice_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"material_id" text,
	"topic" text,
	"exam_board" text,
	"exam_year" integer,
	"correct" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"score_pct" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer,
	"awarded_xp" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_routine_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"output" text,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"schedule_cron" text DEFAULT '0 7 * * *' NOT NULL,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"tool_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"last_result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_syllabus_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"exam_code" text NOT NULL,
	"subject" text NOT NULL,
	"topic_id" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tool_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"tool" text NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"approval" text DEFAULT 'auto' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "exam_board" text;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "exam_year" integer;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "paper_code" text;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "paper_type" text;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "is_past_paper" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tutor_preferences" ADD COLUMN "timezone" text DEFAULT 'Africa/Lagos' NOT NULL;--> statement-breakpoint
ALTER TABLE "tutor_preferences" ADD COLUMN "daily_tool_limit" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_integrations" ADD CONSTRAINT "agent_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_source_conversation_id_tutor_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."tutor_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_practice_attempts" ADD CONSTRAINT "agent_practice_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_practice_attempts" ADD CONSTRAINT "agent_practice_attempts_material_id_study_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."study_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_routine_runs" ADD CONSTRAINT "agent_routine_runs_routine_id_agent_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."agent_routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_routine_runs" ADD CONSTRAINT "agent_routine_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_routines" ADD CONSTRAINT "agent_routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_syllabus_progress" ADD CONSTRAINT "agent_syllabus_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_runs" ADD CONSTRAINT "agent_tool_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_runs" ADD CONSTRAINT "agent_tool_runs_conversation_id_tutor_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."tutor_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_runs" ADD CONSTRAINT "agent_tool_runs_message_id_tutor_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."tutor_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_integrations_user_toolkit_idx" ON "agent_integrations" USING btree ("user_id","toolkit");--> statement-breakpoint
CREATE INDEX "agent_memories_user_updated_idx" ON "agent_memories" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_practice_attempts_idempotency_idx" ON "agent_practice_attempts" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "agent_practice_attempts_user_created_idx" ON "agent_practice_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_routine_runs_user_created_idx" ON "agent_routine_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_routine_runs_routine_created_idx" ON "agent_routine_runs" USING btree ("routine_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_routines_user_enabled_idx" ON "agent_routines" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE INDEX "agent_routines_next_run_idx" ON "agent_routines" USING btree ("next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_syllabus_progress_unique_idx" ON "agent_syllabus_progress" USING btree ("user_id","exam_code","subject","topic_id");--> statement-breakpoint
CREATE INDEX "agent_syllabus_progress_user_exam_idx" ON "agent_syllabus_progress" USING btree ("user_id","exam_code");--> statement-breakpoint
CREATE INDEX "agent_tool_runs_user_created_idx" ON "agent_tool_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_tool_runs_conversation_created_idx" ON "agent_tool_runs" USING btree ("conversation_id","created_at");