import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import {
  bigramRowsToStates,
} from "@/server/adapt/apply";
import {
  baselineMean,
  bigramWeakness,
  MIN_SAMPLES_FOR_WEAKNESS,
} from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import type {
  HistorySummaryOutput,
  HistoryTest,
  HistoryWeakness,
} from "@/types/history";

/** How many recent tests we serve to the client. 500 is comfortably
 *  more than 90 days of regular use (a daily user racks up ~10/day on
 *  the high end). The page bins client-side. */
const RECENT_LIMIT = 500;

/** Top N weakest bigrams returned for the page. Twelve fits in a
 *  list-of-bars panel without scrolling and gives the user enough
 *  signal to spot patterns. */
const WEAKEST_LIMIT = 12;

const summary = defineRoute<void, HistorySummaryOutput>({
  handler: async ({ db, meta }) => {
    const userId = meta.userId as string;
    const [bigramRows, recentRows] = await Promise.all([
      db.bigramModels.listForUser(userId),
      db.tests.recentForUser(userId, RECENT_LIMIT),
    ]);

    const bigramStates = bigramRowsToStates(bigramRows);
    const baseline = baselineMean(bigramStates);

    const weakestPairs: HistoryWeakness[] = [];
    for (const [key, st] of bigramStates) {
      if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
      const isDoubled = key.length === 2 && key[0] === key[1];
      const weak = bigramWeakness(st, baseline, isDoubled);
      if (weak <= 0) continue;
      weakestPairs.push({
        key,
        meanMs: st.mean,
        weakness: weak,
        sampleCount: st.n,
      });
    }
    weakestPairs.sort((a, b) => b.weakness - a.weakness);
    weakestPairs.length = Math.min(weakestPairs.length, WEAKEST_LIMIT);

    let totalSamples = 0;
    for (const st of bigramStates.values()) totalSamples += st.n;

    const recentTests: HistoryTest[] = recentRows.map((r) => ({
      id: r.id,
      startedAtMs: r.startedAt.getTime(),
      // completedAt is nullable in the schema (a test in flight). Fall
      // back to startedAt — a sensible "duration 0" reading rather than
      // null on the wire (which the client would have to defend against
      // in every panel).
      completedAtMs: r.completedAt?.getTime() ?? r.startedAt.getTime(),
      mode: r.mode,
      durationOrWordCount: r.durationOrWordCount,
      wpm: r.wpm,
      accuracy: r.accuracy,
      errorCount: r.errorCount,
      wasCompleted: r.wasCompleted,
    }));

    return {
      recentTests,
      weakestPairs,
      cold: totalSamples < COLD_BIGRAM_THRESHOLD,
      bigramBaselineMs: baseline,
    };
  },
});

export const history = defineNamespace({
  middleware: [requireAuth],
  routes: { summary },
});
