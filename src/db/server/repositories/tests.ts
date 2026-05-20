import { and, desc, eq, gte, inArray, like, lt, max, sql } from "drizzle-orm";
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

/** Output row of `topPlayers` — one row per user with their
 *  lifetime best net-WPM run + completed-test count. Joined with
 *  Clerk display info client-side. */
export type TopPlayerRow = {
  userId: string;
  /** Peak net-WPM across all completed runs (wpm × accuracy / 100). */
  bestNetWpm: number;
  bestWpm: number;
  bestAccuracy: number;
  testId: string;
  mode: string;
  durationOrWordCount: number;
  /** Lifetime completed-test count — drives the secondary "runs" stat
   *  beside the headline tier badge. */
  testsCompleted: number;
};

/** Output row of `topByLevel` — one row per user with their
 *  completed-test count + accumulated wpm-weighted XP. The
 *  leaderboard route derives the user-facing level from the test
 *  count via `levelFromTestsCompleted` (src/lib/level.ts) so the
 *  number matches the level the profile hero shows for the same
 *  user. The `xp` field here is the SUM(wpm * accuracy / 100)
 *  variant — unused by the leaderboard renderer today, kept on
 *  the row for future surfaces that want a skill-weighted total. */
export type TopByLevelRow = {
  userId: string;
  /** Total XP — SUM(wpm * accuracy / 100.0) across every completed
   *  run. Rewards both volume (more runs) and skill (faster runs). */
  xp: number;
  testsCompleted: number;
};

export function testsRepo(db: ServerDrizzle) {
  return {
    async insert(row: NewTestRow): Promise<TestRow> {
      const [inserted] = await db.insert(tests).values(row).returning();
      if (!inserted) throw new Error("tests.insert returned no row");
      return inserted;
    },

    /** Single-row lookup by primary key. Returns null when the id
     *  doesn't exist so callers (share.get, future deep links) can
     *  map cleanly to NOT_FOUND without a throw. */
    async findById(id: string): Promise<TestRow | null> {
      const rows = await db
        .select()
        .from(tests)
        .where(eq(tests.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    /** Lookup by a short id prefix — used by the share slug parser
     *  so a friendly URL like `/r/saif-92wpm-a3f9c0d1` can resolve
     *  back to its full UUIDv4 row. Returns the unique match, null
     *  when the prefix matches nothing, and null when the prefix
     *  matches more than one row (caller maps both to NOT_FOUND so
     *  an ambiguous slug never silently resolves to the wrong run).
     *
     *  Caller is expected to validate the prefix is hex / bounded
     *  length — this method does not. */
    async findByIdPrefix(prefix: string): Promise<TestRow | null> {
      // Limit 2 so we can detect the ambiguous-prefix case without
      // scanning the whole table — a prefix that hits two rows is
      // a "no answer" answer.
      const rows = await db
        .select()
        .from(tests)
        .where(like(tests.id, `${prefix}%`))
        .limit(2);
      if (rows.length !== 1) return null;
      return rows[0] ?? null;
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
      amount?: number | null;
      limit?: number;
      /** When provided, restrict the ranking to this set of user ids
       *  (the friends-scoped leaderboard). An empty array means "no
       *  one to rank" and short-circuits to an empty result — distinct
       *  from `undefined`, which means "everyone" (the global board). */
      userIds?: readonly string[];
    }): Promise<LeaderboardRow[]> {
      const mode = opts.mode;
      const since = opts.sinceMs ?? 0;
      const amount = opts.amount ?? null;
      const limit = Math.max(1, Math.min(100, opts.limit ?? 25));
      // A friends board scoped to an empty set has nothing to rank.
      if (opts.userIds != null && opts.userIds.length === 0) return [];
      // Net WPM expressed in SQL so we can sort + cap in one query
      // rather than pulling everything and sorting in JS. Drizzle's
      // `sql<number>` template gives us a typed projection.
      const netExpr = sql<number>`(${tests.wpm} * ${tests.accuracy} / 100.0)`;
      const filters = [eq(tests.wasCompleted, true)];
      if (mode && mode !== "all") filters.push(eq(tests.mode, mode));
      if (since > 0) filters.push(gte(tests.completedAt, new Date(since)));
      if (amount != null && amount > 0) {
        filters.push(eq(tests.durationOrWordCount, amount));
      }
      if (opts.userIds != null) {
        filters.push(inArray(tests.userId, [...opts.userIds]));
      }
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
    /** Top users by completed-test count. One row per user, ordered
     *  by COUNT(*) descending so the highest-level user lands at
     *  rank 1 — same level economy the profile hero uses (see
     *  src/lib/level.ts: every completed test grants XP_PER_TEST,
     *  every level costs XP_PER_LEVEL, so test count IS level rank).
     *
     *  Also returns the wpm-weighted total (SUM(wpm * accuracy / 100))
     *  on each row — unused by the leaderboard renderer, kept for
     *  future surfaces that want a skill-weighted alternative
     *  ordering without a second query. */
    async topByLevel(opts: { limit?: number }): Promise<TopByLevelRow[]> {
      const limit = Math.max(1, Math.min(50, opts.limit ?? 10));
      const xpExpr = sql<number>`SUM(${tests.wpm} * ${tests.accuracy} / 100.0)`;
      const countExpr = sql<number>`count(*)::int`;
      const rows = await db
        .select({
          userId: tests.userId,
          xp: xpExpr,
          testsCompleted: countExpr,
        })
        .from(tests)
        .where(eq(tests.wasCompleted, true))
        .groupBy(tests.userId)
        .orderBy(desc(countExpr), desc(xpExpr))
        .limit(limit);
      return rows.map((r) => ({
        userId: r.userId,
        xp: Number(r.xp ?? 0),
        testsCompleted: Number(r.testsCompleted ?? 0),
      }));
    },

    /** Top players by lifetime peak net-WPM. One row per user.
     *  Powers the leaderboard's "Top players" pinned section — a
     *  user-centric view alongside the existing run-centric table.
     *
     *  Implementation: over-fetch completed-run rows ordered by
     *  net-WPM desc, walk them in order, keep the first hit per
     *  userId (its lifetime PB), then attach the completed-count by
     *  user in a second query so we don't try to express "max
     *  netWpm + count + tie-break by completedAt" all in one SQL
     *  aggregate. The over-fetch cap (limit * 50) covers the worst
     *  realistic case — one user hammering attempts — without
     *  blowing the row budget. */
    async topPlayers(opts: { limit?: number }): Promise<TopPlayerRow[]> {
      const limit = Math.max(1, Math.min(50, opts.limit ?? 10));
      const netExpr = sql<number>`(${tests.wpm} * ${tests.accuracy} / 100.0)`;
      // Pass 1: pull rows ordered by net-WPM desc; pluck the first
      // (best) row per user. Cap the scan at limit * 50 so cold
      // tables with many users still surface the top few quickly.
      const rows = await db
        .select({
          testId: tests.id,
          userId: tests.userId,
          wpm: tests.wpm,
          accuracy: tests.accuracy,
          mode: tests.mode,
          durationOrWordCount: tests.durationOrWordCount,
          netWpm: netExpr,
        })
        .from(tests)
        .where(eq(tests.wasCompleted, true))
        .orderBy(desc(netExpr))
        .limit(limit * 50);
      const seen = new Set<string>();
      const top: Omit<TopPlayerRow, "testsCompleted">[] = [];
      for (const r of rows) {
        if (seen.has(r.userId)) continue;
        seen.add(r.userId);
        top.push({
          userId: r.userId,
          bestNetWpm: Number(r.netWpm),
          bestWpm: Number(r.wpm),
          bestAccuracy: Number(r.accuracy),
          testId: r.testId,
          mode: r.mode,
          durationOrWordCount: r.durationOrWordCount,
        });
        if (top.length >= limit) break;
      }
      if (top.length === 0) return [];
      // Pass 2: completed-test count per surfaced user. Done in a
      // single grouped query — keeps the round trip count flat
      // regardless of how many users land in `top`.
      const userIds = top.map((t) => t.userId);
      // `inArray` produces `WHERE user_id IN ($2, $3, …)` — the
      // earlier `sql\`${tests.userId} = ANY(${userIds})\`` form
      // splatted the array into separate params on the neon-http
      // driver and Postgres rejected the resulting
      // `ANY(($2,$3,$4))` syntax.
      const counts = await db
        .select({
          userId: tests.userId,
          n: sql<number>`count(*)::int`,
        })
        .from(tests)
        .where(
          and(
            eq(tests.wasCompleted, true),
            inArray(tests.userId, userIds),
          ),
        )
        .groupBy(tests.userId);
      const countByUser = new Map(counts.map((c) => [c.userId, Number(c.n)]));
      return top.map((t) => ({
        ...t,
        testsCompleted: countByUser.get(t.userId) ?? 0,
      }));
    },
  };
}
export type TestsRepo = ReturnType<typeof testsRepo>;
