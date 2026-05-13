import { defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  bigramRowsToStates,
  motorFeatureRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { bigramCategory, deriveFeatureKeys } from "@/server/adapt/motor-features";
import {
  DEFAULT_WEIGHTS,
  MIN_SAMPLES_FOR_WEAKNESS,
  UNTESTED_BIGRAM_BONUS,
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  inChallengeBand,
  predictedWordMs,
  recencyMultiplier,
  scoreWord,
  weakness,
} from "@/server/adapt/scoring";
import {
  scoreWordInputSchema,
  type ScoreWordInput,
  type ScoreWordOutput,
  type WeaknessBreakdown,
} from "@/types/adapt";
import { loadAdaptPrefs } from "./prefs";

/** Tighter route-level cap because scoreWord loads four model tables
 *  and walks per-character against word.length² in the breakdown
 *  loop. 30 calls/minute is more than enough for the confidence
 *  playground's debounced lookups (one per typed word) and stops a
 *  scripted caller from grinding the model tables. */
export const scoreWordRoute = defineRoute<ScoreWordInput, ScoreWordOutput>({
  input: scoreWordInputSchema,
  middleware: [rateLimit({ limit: 30, windowMs: 60_000 })],
  handler: async ({ input, db, meta }) => {
    const userId = meta.userId as string;
    const prefs = await loadAdaptPrefs(db, userId);
    const [bigramRows, trigramRows, motorRows, wordRows] = await Promise.all([
      db.bigramModels.listForUser(userId),
      db.trigramModels.listForUser(userId),
      db.motorFeatureModels.listForUser(userId),
      db.wordModels.listForUser(userId),
    ]);
    const bigramStates = bigramRowsToStates(bigramRows);
    const trigramStates = trigramRowsToStates(trigramRows);
    const motorStates = motorFeatureRowsToStates(motorRows);
    const wordStates = wordRowsToStates(wordRows);
    const bigramBs = bigramBaselines(bigramStates, prefs.handLayout);
    const baselines = {
      bigram: bigramBs,
      trigram: baselineMean(trigramStates),
      motorFeature: baselineMean(motorStates),
      word: baselineMean(wordStates),
    };

    const word = input.word.toLowerCase();
    const total = scoreWord({
      word,
      bigramModels: bigramStates,
      trigramModels: trigramStates,
      motorFeatureModels: motorStates,
      wordModels: wordStates,
      layout: prefs.handLayout,
      baselines,
    });

    const bigrams: WeaknessBreakdown[] = [];
    const seenFeatures = new Set<string>();
    const motorFeatures: WeaknessBreakdown[] = [];
    let alphaContribution = 0;
    let gammaContribution = 0;
    for (let i = 1; i < word.length; i++) {
      const a = word[i - 1]!;
      const b = word[i]!;
      const bg = a + b;
      const bgState = bigramStates.get(bg);
      const isUnsampled = !bgState || bgState.n < MIN_SAMPLES_FOR_WEAKNESS;
      // Mirror scoreWord's bigram contribution exactly so the breakdown
      // explains what the algorithm actually does. Untested bigrams
      // surface as the exploration bonus; sampled ones as their
      // category-aware weakness (same-finger / same-hand / cross-hand).
      const cat = bigramCategory(a, b, prefs.handLayout);
      const cb = baselineForCategory(cat, bigramBs);
      const bgWeak = isUnsampled
        ? UNTESTED_BIGRAM_BONUS
        : weakness(bgState, cb);
      alphaContribution += DEFAULT_WEIGHTS.alpha * bgWeak;
      bigrams.push({
        key: bg,
        weakness: bgWeak,
        meanMs: bgState?.mean ?? null,
        sampleCount: bgState?.n ?? 0,
      });
      for (const fk of deriveFeatureKeys(a, b, prefs.handLayout)) {
        if (seenFeatures.has(fk)) continue;
        seenFeatures.add(fk);
        const fst = motorStates.get(fk);
        const fweak = fst ? weakness(fst, baselines.motorFeature) : 0;
        gammaContribution += DEFAULT_WEIGHTS.gamma * fweak;
        motorFeatures.push({
          key: fk,
          weakness: fweak,
          meanMs: fst?.mean ?? null,
          sampleCount: fst?.n ?? 0,
        });
      }
    }

    const trigrams: WeaknessBreakdown[] = [];
    let betaContribution = 0;
    for (let i = 2; i < word.length; i++) {
      const tg = word[i - 2]! + word[i - 1]! + word[i]!;
      const st = trigramStates.get(tg);
      const tweak = st ? weakness(st, baselines.trigram) : 0;
      betaContribution += DEFAULT_WEIGHTS.beta * tweak;
      trigrams.push({
        key: tg,
        weakness: tweak,
        meanMs: st?.mean ?? null,
        sampleCount: st?.n ?? 0,
      });
    }

    // δ — word-level term. Mirrors scoreWord's word branch so the
    // breakdown explains the same number the algorithm acts on.
    let deltaContribution = 0;
    let wordBreakdown: WeaknessBreakdown | null = null;
    const wordState = wordStates.get(word);
    if (wordState) {
      const wweak =
        baselines.word > 0 ? weakness(wordState, baselines.word) : 0;
      deltaContribution = DEFAULT_WEIGHTS.delta * wweak;
      wordBreakdown = {
        key: word,
        weakness: wweak,
        meanMs: wordState.mean,
        sampleCount: wordState.n,
      };
    }

    const predicted = predictedWordMs(
      word,
      bigramStates,
      bigramBs,
      prefs.handLayout,
    );
    const bigramCount = Math.max(0, word.length - 1);
    const banded =
      bigramBs.overall > 0
        ? inChallengeBand(predicted, bigramBs.overall, bigramCount)
        : true;
    const recency = prefs.adaptRecency.has(word)
      ? recencyMultiplier(prefs.adaptRecency.get(word)!)
      : 1;

    return {
      word,
      total,
      alphaContribution,
      betaContribution,
      gammaContribution,
      deltaContribution,
      predictedMs: predicted,
      recencyMultiplier: recency,
      inChallengeBand: banded,
      bigrams,
      trigrams,
      motorFeatures,
      wordModel: wordBreakdown,
    };
  },
});
