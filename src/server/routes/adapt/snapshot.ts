import { defineRoute } from "@/server";
import {
  bigramRowsToStates,
  motorFeatureRowsToStates,
  trigramRowsToStates,
} from "@/server/adapt/apply";
import { fingerMapHash } from "@/server/adapt/key-map";
import { bigramCategory } from "@/server/adapt/motor-features";
import {
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  fatigueDampener,
  weakness,
  type BigramBaselines,
} from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import type { ModelState } from "@/server/adapt/welford";
import type { HandLayoutPrefs } from "@/lib/hand-layout";
import {
  type AdaptModelRow,
  type AdaptSnapshotOutput,
} from "@/types/adapt";
import { loadAdaptPrefs } from "./prefs";

/** Backs the /biogram visualisation. Reads everything the adapt
 *  algorithm reads and returns it shaped for display, with weakness
 *  pre-computed against the user's own baselines so the client never
 *  has to repeat the math. Bounded by the model size — a fully
 *  populated user is a ~50 KB payload. */
export const snapshot = defineRoute<void, AdaptSnapshotOutput>({
  handler: async ({ db, meta }) => {
    const userId = meta.userId as string;
    const prefs = await loadAdaptPrefs(db, userId);
    const [bigramRows, trigramRows, motorRows, recentTestRows] =
      await Promise.all([
        db.bigramModels.listForUser(userId),
        db.trigramModels.listForUser(userId),
        db.motorFeatureModels.listForUser(userId),
        db.tests.recentForUser(userId, 25),
      ]);

    const bigramStates = bigramRowsToStates(bigramRows);
    const trigramStates = trigramRowsToStates(trigramRows);
    const motorStates = motorFeatureRowsToStates(motorRows);

    const bigramBs = bigramBaselines(bigramStates, prefs.handLayout);
    // Public snapshot output keeps `baselines.bigram` as a single
    // number (the overall mean) for backward compatibility with the
    // biogram visualisation page. Per-category baselines stay
    // server-internal — we don't currently expose them.
    const baselines = {
      bigram: bigramBs.overall,
      trigram: baselineMean(trigramStates),
      motorFeature: baselineMean(motorStates),
    };

    const totalBigramSamples = sumSamples(bigramStates);
    const recentTests = recentTestRows.map((r) => ({
      id: r.id,
      startedAtMs: r.startedAt.getTime(),
      mode: r.mode,
      wpm: r.wpm,
      accuracy: r.accuracy,
      errorCount: r.errorCount,
      wasCompleted: r.wasCompleted,
    }));

    return {
      baselines,
      totalBigramSamples,
      cold: totalBigramSamples < COLD_BIGRAM_THRESHOLD,
      fatigueDampener: fatigueDampener(recentTestRows),
      bigrams: toBigramModelRows(bigramStates, bigramBs, prefs.handLayout),
      trigrams: toModelRows(trigramStates, baselines.trigram),
      motorFeatures: toModelRows(motorStates, baselines.motorFeature),
      recentTests,
      recentlyShown: Array.from(prefs.adaptRecency, ([word, testsAgo]) => ({
        word,
        testsAgo,
      })).sort((a, b) => a.testsAgo - b.testsAgo),
      handLayout: prefs.handLayout,
      fingerMapHash: fingerMapHash(prefs.handLayout),
    };
  },
});

function toModelRows(
  states: ReadonlyMap<string, ModelState>,
  baseline: number,
): AdaptModelRow[] {
  const out: AdaptModelRow[] = [];
  for (const [key, st] of states) {
    out.push({
      key,
      meanMs: st.mean,
      varianceMs: st.variance,
      sampleCount: st.n,
      weakness: weakness(st, baseline),
    });
  }
  out.sort((a, b) => b.weakness - a.weakness);
  return out;
}

/** Bigram-flavoured `toModelRows`. Each pair compares against its
 *  mechanical-category baseline (same-finger / same-hand / cross-hand)
 *  so a same-finger pair like "lo" doesn't get flagged as weak just
 *  because it's inherently a slower motion than a cross-hand alternation. */
function toBigramModelRows(
  states: ReadonlyMap<string, ModelState>,
  baselines: BigramBaselines,
  layout: HandLayoutPrefs,
): AdaptModelRow[] {
  const out: AdaptModelRow[] = [];
  for (const [key, st] of states) {
    const cat =
      key.length === 2
        ? bigramCategory(key[0]!, key[1]!, layout)
        : "unknown";
    const cb = baselineForCategory(cat, baselines);
    out.push({
      key,
      meanMs: st.mean,
      varianceMs: st.variance,
      sampleCount: st.n,
      weakness: weakness(st, cb),
    });
  }
  out.sort((a, b) => b.weakness - a.weakness);
  return out;
}

function sumSamples(states: ReadonlyMap<string, ModelState>): number {
  let total = 0;
  for (const st of states.values()) total += st.n;
  return total;
}
