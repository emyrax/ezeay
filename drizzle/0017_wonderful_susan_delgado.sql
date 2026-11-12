ALTER TABLE "agent_memories" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD COLUMN "size_bytes" integer;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;