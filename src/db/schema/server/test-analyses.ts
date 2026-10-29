import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One compact analysis digest per submitted test (TestDigestV1 in
 *  src/types/typing-analysis.ts). A separate table, never a column on
 *  `tests`: on an unmigrated dev DB only this feature degrades, and every
 *  `select().from(tests)` keeps working. No FK, matching the schema's
 *  convention; deleteForUser serves account deletion and the
 *  "Delete my typing analysis" control. */
export const testAnalyses = pgTable(
  "test_analyses",
  {
    /** = tests.id */
    testId: text("test_id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Copy of tests.started_at. */
    startedAt: timestamp("started_at", { withTimezone: false }).notNull(),
    /** runBucketKey(): "mode|lengthMode|length", plus "|t" for touch. */
    bucket: text("bucket").notNull(),
    /** TestDigestV1.v */
    version: integer("version").notNull(),
    digest: jsonb("digest").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (t) => ({
    userBucketTimeIdx: index("test_analyses_user_bucket_time_idx").on(t.userId, t.bucket, t.startedAt),
  }),
);

export type TestAnalysisRow = typeof testAnalyses.$inferSelect;
export type NewTestAnalysisRow = typeof testAnalyses.$inferInsert;
