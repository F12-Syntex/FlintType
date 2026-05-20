CREATE TABLE "duels" (
	"id" text PRIMARY KEY NOT NULL,
	"challenger_id" text NOT NULL,
	"opponent_id" text NOT NULL,
	"words" jsonb NOT NULL,
	"mode" text NOT NULL,
	"duration_or_word_count" integer NOT NULL,
	"challenger_wpm" double precision NOT NULL,
	"challenger_accuracy" double precision NOT NULL,
	"challenger_wpm_history" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"opponent_wpm" double precision,
	"opponent_accuracy" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "duels_opponent_idx" ON "duels" USING btree ("opponent_id","created_at");--> statement-breakpoint
CREATE INDEX "duels_challenger_idx" ON "duels" USING btree ("challenger_id","created_at");