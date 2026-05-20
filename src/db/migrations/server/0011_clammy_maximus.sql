CREATE TABLE "live_sessions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
