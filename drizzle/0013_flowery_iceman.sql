CREATE TABLE "thread_post_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_post_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_post_likes_post_id_user_id_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"challenger_id" text NOT NULL,
	"challenged_user_id" text NOT NULL,
	"post_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_challenges_challenger_id_challenged_user_id_unique" UNIQUE("challenger_id","challenged_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_following_id_unique" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
ALTER TABLE "thread_post_comments" ADD CONSTRAINT "thread_post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_post_likes" ADD CONSTRAINT "thread_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenger_id_users_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenged_user_id_users_id_fk" FOREIGN KEY ("challenged_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "thread_post_comments_post_idx" ON "thread_post_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "thread_post_likes_post_idx" ON "thread_post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "user_challenges_challenged_idx" ON "user_challenges" USING btree ("challenged_user_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_id");