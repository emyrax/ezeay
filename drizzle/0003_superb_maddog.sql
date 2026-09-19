CREATE TABLE "note_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"note_id" text NOT NULL,
	"role" text NOT NULL,
	"kind" text DEFAULT 'chat' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "model_ratings" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_chats" ADD CONSTRAINT "note_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_chats_user_note_idx" ON "note_chats" USING btree ("user_id","note_id");