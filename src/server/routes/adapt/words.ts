import { defineRoute } from "@/server";
import {
  bigramRowsToStates,
  motorFeatureRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { selectWords } from "@/server/adapt/select";
import {
  requestWordsInputSchema,
  type RequestWordsInput,
  type RequestWordsOutput,
} from "@/types/adapt";
import { loadAdaptPrefs } from "./prefs";

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
        db.tests.recentForUser(userId, 5),
      ]);

    const bigramModels = bigramRowsToStates(bigramRows);
    const trigramModels = trigramRowsToStates(trigramRows);
    const motorFeatureModels = motorFeatureRowsToStates(motorRows);
    const wordModels = wordRowsToStates(wordRows);
    const batchCount = input.batches ?? 1;

    // Run selectWords once per requested batch against the same model
    // snapshot. Each batch uses an independent RNG seed so batches[0]
    // and batches[1] aren't identical word lists. The DB reads above
    // are amortised across all batches — this is the whole point of
    // the multi-batch parameter.
    const batches: string[][] = [];
    let cold = false;
    let prevLast = "";
    for (let i = 0; i < batchCount; i++) {
      const r = selectWords({
        count: input.count,
        pool: input.pool,
        bigramModels,
        trigramModels,
        motorFeatureModels,
        wordModels,
        layout: prefs.handLayout,
        recentTests,
        recentlyShown: prefs.adaptRecency,
      });
      // `selectWords` samples without replacement so a batch is already
      // adjacent-dup free internally. The only remaining seam is the
      // first word of this batch matching the last word of the
      // previous batch — swap it forward with the next non-matching
      // word so the stitched stream never repeats back-to-back.
      const w = [...r.words];
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
      if (r.cold) cold = true;
    }

    return { batches, cold };
  },
});
