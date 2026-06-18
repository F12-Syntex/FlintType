import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import {
  decryptApiKey,
  encryptApiKey,
  isEncryptedApiKey,
  type EncryptedApiKey,
} from "@/server/api-key-crypto";
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

    // Resolve the Ape Key. Manual import (dialog) → input.apiKey.
    // Auto-sync (profile mount) → empty input → decrypt the stored
    // key from the user's prefs slice. Refusing both with VALIDATION
    // is the right behaviour: there's nothing to fetch with.
    const existingPrefs = await db.userPrefs.get(userId);
    const existingSlice = existingPrefs.monkeytypeStats as
      | MonkeytypeStatsSlice
      | undefined;
    let apiKey: string;
    if (input.apiKey) {
      apiKey = input.apiKey;
    } else if (existingSlice && isEncryptedApiKey(existingSlice.encryptedApiKey)) {
      try {
        apiKey = decryptApiKey(existingSlice.encryptedApiKey);
      } catch (err) {
        log.error("monkeytype.import key decrypt failed", err);
        throw new BackendError(
          500,
          "INTERNAL",
          "Stored Ape Key could not be decrypted — re-paste the key to fix.",
        );
      }
    } else {
      throw new BackendError(
        400,
        "VALIDATION",
        "No Ape Key on file — paste one in the import dialog first.",
      );
    }

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
      // Log the full error before mapping so the dev console shows
      // exactly which MT endpoint refused and why. Without this the
      // 502 catch-all swallowed the actual cause (path / status /
      // body), making field bugs un-debuggable.
      log.error("monkeytype.import upstream failed", err, {
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
      });
      if (err instanceof MtAuthError) {
        throw new BackendError(401, "UNAUTHORIZED", err.message);
      }
      if (err instanceof MtRateLimitError) {
        throw new BackendError(429, "RATE_LIMITED", err.message);
      }
      throw new BackendError(
        502,
        "INTERNAL",
        err instanceof Error
          ? `MonkeyType import failed — ${err.message}`
          : "MonkeyType request failed.",
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
    // Encrypt the Ape Key with the server-side AES-256-GCM key so
    // future loads can auto-sync without the user re-pasting. The
    // DB stores ciphertext + IV + auth tag only — never the raw key.
    //
    // Encryption is best-effort: when `API_KEY_ENC_SECRET` is
    // missing (production env var unset, or an operator rotation in
    // progress), `encryptApiKey` throws. We catch it here and ship
    // the slice WITHOUT `encryptedApiKey` — the manual import still
    // succeeds (user gets their tests + PBs + lifetime stats) and
    // only the auto-sync feature degrades (no stored key = no
    // re-pull on next profile load). Falling back here keeps "I
    // pasted my key" from 500-ing on a server-side config oversight.
    let encryptedApiKey: EncryptedApiKey | undefined;
    try {
      encryptedApiKey = encryptApiKey(apiKey);
    } catch (err) {
      log.warn("monkeytype.import key encryption skipped", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    const slice: MonkeytypeStatsSlice = {
      importedAt: Date.now(),
      completedTests: stats.completedTests,
      startedTests: stats.startedTests,
      timeTyping: stats.timeTyping,
      pbs: { time: pbsTime, words: pbsWords },
      ...(encryptedApiKey ? { encryptedApiKey } : {}),
    };
    // Atomic jsonb merge of just our slice so unrelated prefs slices
    // survive even against a concurrent client flush (the old
    // read-modify-write raced it). Specific error message on failure
    // so the dialog tells the user something useful (the dispatcher's
    // fallback would just say "Internal error" without context).
    try {
      await db.userPrefs.merge(userId, { monkeytypeStats: slice });
    } catch (err) {
      log.error("monkeytype.import prefs save failed", err, { userId });
      throw new BackendError(
        500,
        "INTERNAL",
        "Couldn't save your MonkeyType data after the fetch — please try again.",
      );
    }

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
      slice,
    };
  },
});

/** Disconnect: wipe the user's monkeytypeStats slice entirely —
 *  encrypted key, PBs, lifetime stats, all of it. Local tests
 *  imported from MT in the past stay (they're real history rows)
 *  but auto-sync stops firing because the key record is gone. */
const disconnectRoute = defineRoute<void, { ok: true }>({
  middleware: [requireAuth],
  handler: async ({ db, meta, log }) => {
    const userId = meta.userId as string;
    // Atomic key delete — no read-modify-write window.
    await db.userPrefs.merge(userId, {}, ["monkeytypeStats"]);
    log.info("monkeytype.disconnect cleared slice", { userId });
    return { ok: true };
  },
});

export const monkeytype = defineNamespace({
  routes: { import: importRoute, disconnect: disconnectRoute },
});
