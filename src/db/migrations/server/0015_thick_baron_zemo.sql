CREATE TABLE "test_analyses" (
	"test_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"bucket" text NOT NULL,
	"version" integer NOT NULL,
	"digest" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "test_analyses_user_bucket_time_idx" ON "test_analyses" USING btree ("user_id","bucket","started_at");