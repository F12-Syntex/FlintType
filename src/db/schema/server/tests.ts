import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
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
    /** The practice length-kind the run was: 'time' | 'words' | 'quote'
     *  | 'burst'. `mode` above is the *algorithmic* axis (casual /
     *  training / race), which can't tell a TIME-60 run from a WORDS-60
     *  run — so without this both collapse to the same PB / leaderboard
     *  bucket and the share card mislabels them (FT-036 / FT-032). Null on
     *  legacy rows submitted before this column shipped; readers treat
     *  null as the historical "words" assumption. */
    lengthKind: text("length_kind"),
    wpm: doublePrecision("wpm").notNull(),
    accuracy: doublePrecision("accuracy").notNull(),
    errorCount: integer("error_count").notNull(),
    resetCount: integer("reset_count").notNull(),
    wasCompleted: boolean("was_completed").notNull(),
    /** Per-second WPM samples from the run, used to render the
     *  results-screen-style WPM trace on the share card. JSONB so the
     *  shape can evolve without a migration; client posts the data
     *  it already computed for the live chart and the server trusts
     *  it (same trust model as wpm / accuracy above — these are
     *  presentation data, not algorithmic inputs). Capped client-side
     *  to ~300 samples (5min of 1-sec ticks) so payloads stay small.
     *  Null on legacy rows submitted before the share feature shipped. */
    wpmHistory: jsonb("wpm_history"),
    /** Roll-up stats also derived from the run; persisted so the
     *  share card can show the same seven-stat row the user saw on
     *  the post-test summary. Null on legacy rows. */
    rawWpm: doublePrecision("raw_wpm"),
    peakWpm: doublePrecision("peak_wpm"),
    avgWpm: doublePrecision("avg_wpm"),
    stallWpm: doublePrecision("stall_wpm"),
    consistency: doublePrecision("consistency"),
  },
  (t) => ({
    userTimeIdx: index("tests_user_time_idx").on(t.userId, t.startedAt),
  }),
);

export type TestRow = typeof tests.$inferSelect;
export type NewTestRow = typeof tests.$inferInsert;
