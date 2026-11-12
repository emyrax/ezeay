CREATE TABLE "tutor_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"persona" text DEFAULT 'patient_tutor' NOT NULL,
	"mode" text DEFAULT 'materials' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tutor_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"kind" text DEFAULT 'chat' NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"persona" text DEFAULT 'patient_tutor' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"exam_type" text DEFAULT 'WAEC' NOT NULL,
	"exam_date" text,
	"locale" text DEFAULT 'en-NG' NOT NULL,
	"daily_message_limit" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutor_conversations" ADD CONSTRAINT "tutor_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_conversation_id_tutor_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."tutor_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_preferences" ADD CONSTRAINT "tutor_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tutor_conversations_user_updated_idx" ON "tutor_conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "tutor_messages_conversation_created_idx" ON "tutor_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "tutor_messages_user_created_idx" ON "tutor_messages" USING btree ("user_id","created_at");