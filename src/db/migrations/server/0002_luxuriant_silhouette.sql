CREATE TABLE "word_models" (
	"user_id" text NOT NULL,
	"word" text NOT NULL,
	"mean_ms" double precision NOT NULL,
	"variance_ms" double precision NOT NULL,
	"sample_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "word_models_user_id_word_pk" PRIMARY KEY("user_id","word")
);
