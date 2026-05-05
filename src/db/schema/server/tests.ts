import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Per-test summary. The algorithm reads the recent rows for fatigue
 *  detection and recency penalty; the history surface reads them for
 *  user-facing analytics. Raw keystroke timings live transiently on
 *  the request and are not persisted — once they've been folded into
 *  the bigram / trigram / motor-feature models the source data has
 *  served its purpose. */
export const tests = pgTable(
  "tests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: false }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: false }),
    /** 'casual' (no adaptive influence), 'training' (adaptive on),
     *  'reverse_adaptive' (intentionally easy practice). The string
     *  is open so we can add modes without a migration. */
    mode: text("mode").notNull(),
    /** WORDS mode → number of target words; TIME mode → seconds;
     *  QUOTE mode → group index. The algorithm doesn't read this
     *  field; it's for history. */
    durationOrWordCount: integer("duration_or_word_count").notNull(),
    wpm: doublePrecision("wpm").notNull(),
    accuracy: doublePrecision("accuracy").notNull(),
    errorCount: integer("error_count").notNull(),
    resetCount: integer("reset_count").notNull(),
    wasCompleted: boolean("was_completed").notNull(),
  },
  (t) => ({
    userTimeIdx: index("tests_user_time_idx").on(t.userId, t.startedAt),
  }),
);

export type TestRow = typeof tests.$inferSelect;
export type NewTestRow = typeof tests.$inferInsert;
