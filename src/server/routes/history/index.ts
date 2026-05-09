import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import {
  bigramRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { bigramCategory } from "@/server/adapt/motor-features";
import {
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  MIN_SAMPLES_FOR_WEAKNESS,
  weakness,
} from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import { ensureHandLayout } from "@/lib/hand-layout";
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

/** Top N worst words. Larger than the bigram cap because the
 *  worst-words drill (`/app/drills/worst-words`) leans on this list
 *  directly and asks the user to burst 20 of them. */
const WORST_WORDS_LIMIT = 20;

const summary = defineRoute<void, HistorySummaryOutput>({
  handler: async ({ db, meta }) => {
    const userId = meta.userId as string;
    // Categorisation reads the user's finger map (Dvorak / Colemak
    // users have different same-finger pairs than QWERTY). Load it
    // alongside the model so weakness rankings respect the layout
    // the user actually types on.
    const prefsBlob = await db.userPrefs.get(userId);
    const layout = ensureHandLayout(prefsBlob.handLayout);
    const [bigramRows, trigramRows, wordRows, recentRows] = await Promise.all([
      db.bigramModels.listForUser(userId),
      db.trigramModels.listForUser(userId),
      db.wordModels.listForUser(userId),
      db.tests.recentForUser(userId, RECENT_LIMIT),
    ]);

    const bigramStates = bigramRowsToStates(bigramRows);
    const baselines = bigramBaselines(bigramStates, layout);

    const weakestPairs: HistoryWeakness[] = [];
    for (const [key, st] of bigramStates) {
      if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
      if (key.length !== 2) continue;
      const cat = bigramCategory(key[0]!, key[1]!, layout);
      const weak = weakness(st, baselineForCategory(cat, baselines));
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

    // Trigrams use a single overall baseline — they encode word-level
    // sequences where mechanical category is less load-bearing than
    // for bigrams. The drill-pickers and history panel both consume
    // this list; sorting + capping is the same shape.
    const trigramStates = trigramRowsToStates(trigramRows);
    const trigramBaseline = baselineMean(trigramStates);
    const weakestTrigrams: HistoryWeakness[] = [];
    for (const [key, st] of trigramStates) {
      if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
      const weak = weakness(st, trigramBaseline);
      if (weak <= 0) continue;
      weakestTrigrams.push({
        key,
        meanMs: st.mean,
        weakness: weak,
        sampleCount: st.n,
      });
    }
    weakestTrigrams.sort((a, b) => b.weakness - a.weakness);
    weakestTrigrams.length = Math.min(weakestTrigrams.length, WEAKEST_LIMIT);

    // Word-level weaknesses use the user's own sample-weighted word
    // baseline. A word whose mean is well above the user's typical
    // word time is the kind of word the worst-words drill should
    // surface — anchored against the user's pace, not an absolute
    // ms threshold.
    const wordStates = wordRowsToStates(wordRows);
    const wordBaseline = baselineMean(wordStates);
    const weakestWords: HistoryWeakness[] = [];
    for (const [key, st] of wordStates) {
      if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
      const weak = weakness(st, wordBaseline);
      if (weak <= 0) continue;
      weakestWords.push({
        key,
        meanMs: st.mean,
        weakness: weak,
        sampleCount: st.n,
      });
    }
    weakestWords.sort((a, b) => b.weakness - a.weakness);
    weakestWords.length = Math.min(weakestWords.length, WORST_WORDS_LIMIT);

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
      weakestTrigrams,
      weakestWords,
      cold: totalSamples < COLD_BIGRAM_THRESHOLD,
      // Public output keeps a single bigram baseline (the overall
      // sample-weighted mean). Per-category baselines are an internal
      // detail; the page just needs "user's typical bigram time".
      bigramBaselineMs: baselines.overall,
      trigramBaselineMs: trigramBaseline,
      wordBaselineMs: wordBaseline,
    };
  },
});

export const history = defineNamespace({
  middleware: [requireAuth],
  routes: { summary },
});
