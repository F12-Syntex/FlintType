import { defineRoute } from "@/server";
import {
  bigramRowsToStates,
  motorFeatureRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { selectBatches } from "@/server/adapt/select";
import {
  requestWordsInputSchema,
  type RequestWordsInput,
  type RequestWordsOutput,
} from "@/types/adapt";
import { loadAdaptPrefs } from "./prefs";

/** Recent tests read for difficulty pacing: enough for a full session
 *  plus a "usual speed" reference (see `pacing.ts`). */
const PACING_TESTS = 20;

export const words = defineRoute<RequestWordsInput, RequestWordsOutput>({
  input: requestWordsInputSchema,
  handler: async ({ input, db, meta }) => {
    const userId = meta.userId as string;
    const prefs = await loadAdaptPrefs(db, userId);

    const [bigramRows, trigramRows, motorRows, wordRows, recentTests] =
      await Promise.all([
        db.bigramModels.listForUser(userId),
        db.trigramModels.listForUser(userId),
        db.motorFeatureModels.listForUser(userId),
        db.wordModels.listForUser(userId),
        db.tests.recentForUser(userId, PACING_TESTS),
      ]);

    const bigramModels = bigramRowsToStates(bigramRows);
    const trigramModels = trigramRowsToStates(trigramRows);
    const motorFeatureModels = motorFeatureRowsToStates(motorRows);
    const wordModels = wordRowsToStates(wordRows);
    const batchCount = input.batches ?? 1;

    // Score the pool once against this snapshot and draw every batch
    // from it. Later batches treat earlier ones as just shown, so the
    // prefetch queue serves fresh words on each restart. The DB reads
    // above are amortised across all batches — the whole point of the
    // multi-batch parameter.
    const r = selectBatches(
      {
        count: input.count,
        pool: input.pool,
        bigramModels,
        trigramModels,
        motorFeatureModels,
        wordModels,
        layout: prefs.handLayout,
        recentTests,
        recentlyShown: prefs.adaptRecency,
        nowMs: Date.now(),
      },
      batchCount,
    );
    const cold = r.cold;
    // A batch never repeats a word internally (sampling is without
    // replacement). The only remaining seam is the first word of a
    // batch matching the last word of the previous one — swap it
    // forward with the next non-matching word so the stitched stream
    // never repeats back-to-back.
    const batches: string[][] = [];
    let prevLast = "";
    for (const batch of r.batches) {
      const w = [...batch];
      if (prevLast && w.length > 1 && w[0] === prevLast) {
        for (let j = 1; j < w.length; j++) {
          if (w[j] !== prevLast) {
            [w[0], w[j]] = [w[j]!, w[0]!];
            break;
          }
        }
      }
      batches.push(w);
      prevLast = w[w.length - 1] ?? prevLast;
    }

    return { batches, cold };
  },
});
