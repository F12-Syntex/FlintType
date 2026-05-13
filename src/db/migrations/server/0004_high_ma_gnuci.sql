CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
