import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  fetchMonkeytypeResults,
  MtAuthError,
  MtRateLimitError,
  mtResultToRow,
  type MtResult,
} from "@/server/monkeytype-import";
import {
  monkeytypeImportInputSchema,
  type MonkeytypeImportInput,
  type MonkeytypeImportOutput,
} from "@/types/monkeytype";

const importRoute = defineRoute<MonkeytypeImportInput, MonkeytypeImportOutput>({
  input: monkeytypeImportInputSchema,
  // Tight per-user budget: MT itself rate-limits to ~30/hour and
  // the import is a heavy multi-row insert — three pulls per hour
  // is plenty for the dialog UX.
  middleware: [requireAuth, rateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })],
  handler: async ({ input, db, meta, log }) => {
    const userId = meta.userId as string;
    let results: MtResult[];
    try {
      results = await fetchMonkeytypeResults(input.apiKey);
    } catch (err) {
      if (err instanceof MtAuthError) {
        throw new BackendError(401, "UNAUTHORIZED", err.message);
      }
      if (err instanceof MtRateLimitError) {
        throw new BackendError(429, "RATE_LIMITED", err.message);
      }
      throw new BackendError(
        502,
        "INTERNAL",
        err instanceof Error ? err.message : "MonkeyType request failed.",
      );
    }

    log.info("monkeytype.import fetched", { count: results.length });

    // Dedup against the user's existing tests by startedAt timestamp
    // — MT's own _id isn't stored locally, so timestamp is the
    // closest stable key for a given run.
    const recent = await db.tests.recentForUser(userId, 5000);
    const seenStartedAt = new Set(
      recent.map((t) => t.startedAt.getTime()),
    );

    let imported = 0;
    let skipped = 0;
    for (const r of results) {
      const startedMs = Number(r.timestamp);
      if (!Number.isFinite(startedMs)) {
        skipped += 1;
        continue;
      }
      if (seenStartedAt.has(startedMs)) {
        skipped += 1;
        continue;
      }
      const row = mtResultToRow(r, userId, `mt_${r._id}`);
      if (!row) {
        skipped += 1;
        continue;
      }
      try {
        await db.tests.insert(row);
        imported += 1;
        seenStartedAt.add(startedMs);
      } catch (err) {
        log.warn("monkeytype.import row insert failed", {
          id: r._id,
          error: err instanceof Error ? err.message : String(err),
        });
        skipped += 1;
      }
    }

    return { imported, skipped, fetched: results.length };
  },
});

export const monkeytype = defineNamespace({
  routes: { import: importRoute },
});
