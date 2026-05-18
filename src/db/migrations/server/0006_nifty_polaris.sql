ALTER TABLE "tests" ADD COLUMN "wpm_history" jsonb;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "raw_wpm" double precision;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "peak_wpm" double precision;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "avg_wpm" double precision;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "stall_wpm" double precision;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "consistency" double precision;