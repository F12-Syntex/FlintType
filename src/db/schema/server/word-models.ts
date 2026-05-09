import {
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Per-user, per-word running statistics — the typing-time mean and
 *  variance for each word the user has actually completed cleanly.
 *  Same Welford shape as the bigram and trigram tables; the only
 *  difference is the keying column (the whole word) and that the
 *  measurement is the total time from the word's first keystroke to
 *  its last (not an inter-keystroke interval).
 *
 *  The algorithm reads the full set at scoring time and bulk-upserts
 *  the deltas after each test. Words flagged as "slowest" (high mean
 *  vs. predicted-from-bigrams baseline) are surfaced in the history
 *  summary and feed the new "Worst-words burst" drill. */
export const wordModels = pgTable(
  "word_models",
  {
    userId: text("user_id").notNull(),
    word: text("word").notNull(),
    meanMs: doublePrecision("mean_ms").notNull(),
    varianceMs: doublePrecision("variance_ms").notNull(),
    sampleCount: integer("sample_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.word] }),
  }),
);

export type WordModelRow = typeof wordModels.$inferSelect;
export type NewWordModelRow = typeof wordModels.$inferInsert;
