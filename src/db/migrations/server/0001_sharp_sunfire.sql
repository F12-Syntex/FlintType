CREATE TABLE "bigram_models" (
	"user_id" text NOT NULL,
	"bigram" text NOT NULL,
	"mean_ms" double precision NOT NULL,
	"variance_ms" double precision NOT NULL,
	"sample_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bigram_models_user_id_bigram_pk" PRIMARY KEY("user_id","bigram")
);
--> statement-breakpoint
CREATE TABLE "motor_feature_models" (
	"user_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"mean_ms" double precision NOT NULL,
	"variance_ms" double precision NOT NULL,
	"sample_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "motor_feature_models_user_id_feature_key_pk" PRIMARY KEY("user_id","feature_key")
);
--> statement-breakpoint
CREATE TABLE "trigram_models" (
	"user_id" text NOT NULL,
	"trigram" text NOT NULL,
	"mean_ms" double precision NOT NULL,
	"variance_ms" double precision NOT NULL,
	"sample_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trigram_models_user_id_trigram_pk" PRIMARY KEY("user_id","trigram")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"mode" text NOT NULL,
	"duration_or_word_count" integer NOT NULL,
	"wpm" double precision NOT NULL,
	"accuracy" double precision NOT NULL,
	"error_count" integer NOT NULL,
	"reset_count" integer NOT NULL,
	"was_completed" boolean NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tests_user_time_idx" ON "tests" USING btree ("user_id","started_at");