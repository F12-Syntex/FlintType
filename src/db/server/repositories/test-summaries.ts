import { and, desc, eq, lt, type SQL } from "drizzle-orm";
import { tests } from "@/db/schema/server/tests";
import type { TestSummaryRow } from "@/types/insights";
import type { ServerDrizzle } from "../driver";

/** A narrow projection over `tests` for the typing analysis (spec-30
 *  §2.2). It never selects wpm_history or the roll-up columns, and it lives
 *  in its own file so the tests repo doesn't grow. */
export function testSummariesRepo(db: ServerDrizzle) {
  return {
    /** Newest first. Optional beforeMs excludes tests that started at or
     *  after it. */
    async recentForUser(userId: string, limit: number, beforeMs?: number): Promise<TestSummaryRow[]> {
      const where: SQL[] = [eq(tests.userId, userId)];
      if (beforeMs !== undefined) where.push(lt(tests.startedAt, new Date(beforeMs)));
      return db
        .select({
          id: tests.id,
          startedAt: tests.startedAt,
          mode: tests.mode,
          lengthMode: tests.lengthMode,
          durationOrWordCount: tests.durationOrWordCount,
          wpm: tests.wpm,
          accuracy: tests.accuracy,
          errorCount: tests.errorCount,
          wasCompleted: tests.wasCompleted,
        })
        .from(tests)
        .where(and(...where))
        .orderBy(desc(tests.startedAt), desc(tests.id))
        .limit(limit);
    },
  };
}

export type TestSummariesRepo = ReturnType<typeof testSummariesRepo>;
