import { ensureHandLayout } from "@/lib/hand-layout";
import { assembleOverview, type PatternInput } from "@/lib/typing-analysis/pooled/overview";
import { defineRoute } from "@/server";
import { bigramRowsToStates, wordRowsToStates } from "@/server/adapt/apply";
import { rateLimit } from "@/server/middleware/rate-limit";
import { weakestPatterns } from "@/server/weakest-patterns";
import type { HistoryWeakness } from "@/types/history";
import {
  insightsOverviewInputSchema,
  type InsightsOverviewInput,
  type InsightsOverviewOutput,
  type PatternRow,
} from "@/types/insights";
import { loadInsightsData } from "./load";

/** How many pairs and words the practice lists show. */
const PRACTICE_ROWS = 5;
/** The digests one bucket's windows read (recent 10 + earlier 30). */
const DIGESTS = 40;

const toRow = (w: HistoryWeakness): PatternRow => ({
  key: w.key, extraMs: Math.round(w.weakness), meanMs: Math.round(w.meanMs), samples: w.sampleCount,
});

/** The whole /insights page for one bucket (spec-30 §6.2): tests, the
 *  analysis index, one bucket's digests, the bigram models, the word
 *  models and the prefs (hand layout). Six indexed reads, no Clerk call. */
export const overview = defineRoute<InsightsOverviewInput, InsightsOverviewOutput>({
  input: insightsOverviewInputSchema,
  middleware: [rateLimit({ limit: 20, windowMs: 60_000 })],
  handler: async (ctx) => {
    const userId = ctx.meta.userId as string;
    const [data, bigramRows, wordRows, prefs] = await Promise.all([
      loadInsightsData(ctx, { bucket: ctx.input.bucket, digestsLimit: DIGESTS }),
      ctx.db.bigramModels.listForUser(userId),
      ctx.db.wordModels.listForUser(userId),
      ctx.db.userPrefs.get(userId),
    ]);
    const w = weakestPatterns(
      { bigrams: bigramRowsToStates(bigramRows), trigrams: new Map(), words: wordRowsToStates(wordRows) },
      ensureHandLayout(prefs.handLayout),
    );
    const patterns: PatternInput = {
      pairs: w.pairs.slice(0, PRACTICE_ROWS).map(toRow),
      words: w.words.slice(0, PRACTICE_ROWS).map(toRow),
      cold: w.cold, weakPairs: w.pairs.length, weakWords: w.words.length,
    };
    return assembleOverview({
      rows: data.rows, index: data.index, digests: data.digests, patterns,
      nowMs: Date.now(), bucket: data.chosenBucket ?? undefined,
    });
  },
});
