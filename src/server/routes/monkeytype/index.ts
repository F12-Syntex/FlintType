import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  fetchMonkeytypeResults,
  fetchMonkeytypeStats,
  fetchPersonalBests,
  MtAuthError,
  MtRateLimitError,
  mtResultToRow,
  type MtResult,
  type MtStats,
} from "@/server/monkeytype-import";
import {
  monkeytypeImportInputSchema,
  type MonkeytypeImportInput,
  type MonkeytypeImportOutput,
  type MonkeytypeStatsSlice,
} from "@/types/monkeytype";

const RESULTS_LIMIT = 10;

const importRoute = defineRoute<MonkeytypeImportInput, MonkeytypeImportOutput>({
  input: monkeytypeImportInputSchema,
  // Tight per-user budget: MT itself rate-limits to ~30/hour and
  // the import is a heavy multi-row insert + four MT round-trips.
  // Three pulls per hour is plenty for the dialog UX.
  middleware: [requireAuth, rateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })],
  handler: async ({ input, db, meta, log }) => {
    const userId = meta.userId as string;
    const apiKey = input.apiKey;

    // Four parallel MT round-trips — Ape Key authorises all of them
    // identically. Promise.all so the dialog spinner has minimum
    // wall time. Errors propagate from any branch.
    let results: MtResult[];
    let pbsTime: Record<string, { wpm: number; acc: number }>;
    let pbsWords: Record<string, { wpm: number; acc: number }>;
    let stats: MtStats;
    try {
      [results, pbsTime, pbsWords, stats] = await Promise.all([
        fetchMonkeytypeResults(apiKey, RESULTS_LIMIT),
        fetchPersonalBests(apiKey, "time"),
        fetchPersonalBests(apiKey, "words"),
        fetchMonkeytypeStats(apiKey),
      ]);
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

    log.info("monkeytype.import fetched", {
      results: results.length,
      pbsTime: Object.keys(pbsTime).length,
      pbsWords: Object.keys(pbsWords).length,
      stats,
    });

    // ─── Last 10 tests → tests table (with dedup) ────────────────
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

    // ─── PBs + lifetime stats → user_prefs slice ─────────────────
    // Read-merge-write the user's prefs blob so we don't clobber
    // unrelated slices (caret, theme, behaviour, …). Race-only
    // risk: a concurrent client write at the exact moment of
    // import could lose; acceptable for a manual user action.
    const slice: MonkeytypeStatsSlice = {
      importedAt: Date.now(),
      completedTests: stats.completedTests,
      startedTests: stats.startedTests,
      timeTyping: stats.timeTyping,
      pbs: { time: pbsTime, words: pbsWords },
    };
    const existing = await db.userPrefs.get(userId);
    await db.userPrefs.set(userId, {
      ...existing,
      monkeytypeStats: slice,
    });

    return {
      imported,
      skipped,
      fetched: results.length,
      pbsImported:
        Object.keys(pbsTime).length + Object.keys(pbsWords).length,
      stats: {
        completedTests: stats.completedTests,
        startedTests: stats.startedTests,
        timeTyping: stats.timeTyping,
      },
    };
  },
});

export const monkeytype = defineNamespace({
  routes: { import: importRoute },
});
