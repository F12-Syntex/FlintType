import { and, desc, eq, gte, lt, max, sql } from "drizzle-orm";
import { tests } from "@/db/schema/server/tests";
import type { NewTestRow, TestRow } from "@/types/adapt";
import type { ServerDrizzle } from "../driver";

/** Output row of the public leaderboard query — joined with the
 *  Clerk-mirror display name client-side, so the repo only returns
 *  raw test fields. */
export type LeaderboardRow = {
  testId: string;
  userId: string;
  wpm: number;
  accuracy: number;
  netWpm: number;
  mode: string;
  durationOrWordCount: number;
  completedAt: Date;
};

export function testsRepo(db: ServerDrizzle) {
  return {
    async insert(row: NewTestRow): Promise<TestRow> {
      const [inserted] = await db.insert(tests).values(row).returning();
      if (!inserted) throw new Error("tests.insert returned no row");
      return inserted;
    },

    async recentForUser(
      userId: string,
      limit: number,
    ): Promise<TestRow[]> {
      return db
        .select()
        .from(tests)
        .where(eq(tests.userId, userId))
        .orderBy(desc(tests.startedAt))
        .limit(limit);
    },

    /** Previous best WPM for one (mode, durationOrWordCount) bucket
     *  among *completed* runs that started *before* `beforeMs`.
     *  Returns `null` if the user has no prior completed run in that
     *  bucket — used by adapt.submit to decide whether the just-
     *  inserted test is a fresh personal best.
     *
     *  `beforeMs` lets the caller pass the just-inserted run's
     *  `startedAt`; the query stays oblivious to whether the row is
     *  already in the DB at call time (it can run either side of the
     *  insert). */
    async bestBefore(
      userId: string,
      mode: string,
      durationOrWordCount: number,
      beforeMs: number,
    ): Promise<number | null> {
      const rows = await db
        .select({ wpm: max(tests.wpm) })
        .from(tests)
        .where(
          and(
            eq(tests.userId, userId),
            eq(tests.mode, mode),
            eq(tests.durationOrWordCount, durationOrWordCount),
            eq(tests.wasCompleted, true),
            lt(tests.startedAt, new Date(beforeMs)),
          ),
        );
      const v = rows[0]?.wpm;
      return v == null ? null : Number(v);
    },

    /** Top leaderboard — ranks completed runs by `netWpm` (wpm ×
     *  accuracy / 100). Filterable by mode (or "all") and by a
     *  rolling time window (`sinceMs`, or 0 for all-time). One row
     *  per `(userId, mode, durationOrWordCount)` bucket — we surface
     *  each user's best run per bucket rather than letting one fast
     *  typist hog the table with repeat attempts. Caller renders the
     *  user display name from a Clerk lookup; the repo only knows ids. */
    async topLeaderboard(opts: {
      mode?: string;
      sinceMs?: number;
      limit?: number;
    }): Promise<LeaderboardRow[]> {
      const mode = opts.mode;
      const since = opts.sinceMs ?? 0;
      const limit = Math.max(1, Math.min(100, opts.limit ?? 25));
      // Net WPM expressed in SQL so we can sort + cap in one query
      // rather than pulling everything and sorting in JS. Drizzle's
      // `sql<number>` template gives us a typed projection.
      const netExpr = sql<number>`(${tests.wpm} * ${tests.accuracy} / 100.0)`;
      const filters = [eq(tests.wasCompleted, true)];
      if (mode && mode !== "all") filters.push(eq(tests.mode, mode));
      if (since > 0) filters.push(gte(tests.completedAt, new Date(since)));
      const rows = await db
        .select({
          testId: tests.id,
          userId: tests.userId,
          wpm: tests.wpm,
          accuracy: tests.accuracy,
          mode: tests.mode,
          durationOrWordCount: tests.durationOrWordCount,
          completedAt: tests.completedAt,
          netWpm: netExpr,
        })
        .from(tests)
        .where(and(...filters))
        .orderBy(desc(netExpr))
        .limit(limit * 4); // over-fetch so we can dedupe by user
      // Dedupe so each user only appears once per (mode, bucket) —
      // keeps the table from filling with a single user's PB attempts.
      const seen = new Set<string>();
      const out: LeaderboardRow[] = [];
      for (const r of rows) {
        const key = `${r.userId}|${r.mode}|${r.durationOrWordCount}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          testId: r.testId,
          userId: r.userId,
          wpm: Number(r.wpm),
          accuracy: Number(r.accuracy),
          netWpm: Number(r.netWpm),
          mode: r.mode,
          durationOrWordCount: r.durationOrWordCount,
          // `gte(tests.completedAt, ...)` filters guarantee non-null
          // even when sinceMs=0; defensive fallback keeps TS happy.
          completedAt:
            r.completedAt instanceof Date
              ? r.completedAt
              : r.completedAt != null
                ? new Date(r.completedAt)
                : new Date(0),
        });
        if (out.length >= limit) break;
      }
      return out;
    },
  };
}
export type TestsRepo = ReturnType<typeof testsRepo>;
