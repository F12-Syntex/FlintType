import { and, desc, eq, lt, max } from "drizzle-orm";
import { tests } from "@/db/schema/server/tests";
import type { NewTestRow, TestRow } from "@/types/adapt";
import type { ServerDrizzle } from "../driver";

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
  };
}
export type TestsRepo = ReturnType<typeof testsRepo>;
