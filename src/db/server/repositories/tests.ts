import { desc, eq } from "drizzle-orm";
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
  };
}
export type TestsRepo = ReturnType<typeof testsRepo>;
