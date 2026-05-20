import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Async "beat my run" duels. The challenger snapshots a completed run
 *  — the exact passage + their per-second WPM trace — and dares a
 *  (mutual-friend) opponent to beat it. The opponent later types the
 *  *same* passage while a ghost cursor replays the challenger's pace
 *  (integrated from `challengerWpmHistory`, the same trick the race
 *  bot tick uses), then their result is recorded and compared.
 *
 *  Snapshotting the passage is deliberate: solo practice doesn't
 *  persist a seed we could regenerate from, so the words live on the
 *  duel row. No live infrastructure is involved — a duel is pure
 *  request/response either side can complete whenever.
 *
 *  No FK constraints (same mirror convention as the rest of the
 *  schema); `challengerId` / `opponentId` are Clerk user ids. */
export const duels = pgTable(
  "duels",
  {
    id: text("id").primaryKey(),
    challengerId: text("challenger_id").notNull(),
    opponentId: text("opponent_id").notNull(),
    /** The exact passage the opponent must type — `string[]` (one word
     *  per element). Snapshotted so the replay is reproducible. */
    words: jsonb("words").notNull(),
    /** Mirrors the test row's `mode` + `durationOrWordCount` so the
     *  duel reads as "Casual 25 words" etc. */
    mode: text("mode").notNull(),
    durationOrWordCount: integer("duration_or_word_count").notNull(),
    /** The challenger's run being beaten. */
    challengerWpm: doublePrecision("challenger_wpm").notNull(),
    challengerAccuracy: doublePrecision("challenger_accuracy").notNull(),
    /** Per-second WPM samples (`number[]`) that drive the ghost cursor.
     *  Null on rows created before the trace was captured / when the
     *  client had none — the opponent then races without a ghost. */
    challengerWpmHistory: jsonb("challenger_wpm_history"),
    /** `pending` until the opponent finishes, then `completed`. Open
     *  string so a future `declined` / `expired` needs no migration. */
    status: text("status").notNull().default("pending"),
    opponentWpm: doublePrecision("opponent_wpm"),
    opponentAccuracy: doublePrecision("opponent_accuracy"),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: false }),
  },
  (t) => ({
    // "duels challenged me" and "duels I sent" — both indexed.
    opponentIdx: index("duels_opponent_idx").on(t.opponentId, t.createdAt),
    challengerIdx: index("duels_challenger_idx").on(
      t.challengerId,
      t.createdAt,
    ),
  }),
);

export type DuelRow = typeof duels.$inferSelect;
export type NewDuelRow = typeof duels.$inferInsert;
