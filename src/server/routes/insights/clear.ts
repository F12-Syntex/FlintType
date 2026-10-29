import { defineRoute } from "@/server";
import { isMissingTable } from "@/server/db-errors";
import { rateLimit } from "@/server/middleware/rate-limit";
import type { ClearAnalysesOutput } from "@/types/insights";

/** "Delete my typing analysis": every digest the signed-in user has. Logs
 *  the count only. A missing table means there is nothing to delete. */
export const clear = defineRoute<void, ClearAnalysesOutput>({
  middleware: [rateLimit({ limit: 3, windowMs: 60_000 })],
  handler: async ({ db, meta, log }) => {
    let deleted = 0;
    try {
      deleted = await db.testAnalyses.deleteForUser(meta.userId as string);
    } catch (err) {
      if (!isMissingTable(err, "test_analyses")) throw err;
    }
    log.info("typing analysis cleared", { deleted });
    return { deleted };
  },
});
