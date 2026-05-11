import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import type { Database } from "@/db/server";
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
import {
  publicProfileInputSchema,
  type HistorySummaryOutput,
  type HistoryTest,
  type HistoryWeakness,
  type PublicProfileInput,
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
 *  worst-words drill (`/drills/worst-words`) leans on this list
 *  directly and asks the user to burst 20 of them. */
const WORST_WORDS_LIMIT = 20;

/** Shared loader — reads everything one user's history surface needs.
 *  Driven by `userId` so both the auth-gated `summary` route (caller
 *  is the subject) and the public `publicProfile` route (subject is
 *  looked up by username) use the same query path + shape. */
async function loadHistorySummary(
  db: Database,
  userId: string,
): Promise<HistorySummaryOutput> {
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
    bigramBaselineMs: baselines.overall,
    trigramBaselineMs: trigramBaseline,
    wordBaselineMs: wordBaseline,
  };
}

const summary = defineRoute<void, HistorySummaryOutput>({
  middleware: [requireAuth],
  handler: async ({ db, meta }) =>
    loadHistorySummary(db, meta.userId as string),
});

/** Public profile lookup — anyone (including signed-out viewers)
 *  can pull another user's history by Clerk username. Throws
 *  NOT_FOUND when the username doesn't exist on Clerk. The data
 *  shape is identical to `summary` so the profile UI can render
 *  either source uniformly; only the owner-only chrome (Edit,
 *  MonkeyType, Sign out) is gated client-side. */
const publicProfile = defineRoute<PublicProfileInput, HistorySummaryOutput>({
  input: publicProfileInputSchema,
  handler: async ({ input, db }) => {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      username: [input.username],
    });
    const user = list.data[0];
    if (!user) {
      throw new BackendError(
        404,
        "NOT_FOUND",
        `No flinttype profile for @${input.username}`,
      );
    }
    return loadHistorySummary(db, user.id);
  },
});

export const history = defineNamespace({
  routes: { summary, publicProfile },
});
