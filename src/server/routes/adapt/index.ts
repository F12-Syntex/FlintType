import { randomUUID } from "node:crypto";
import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  bigramRowsToStates,
  motorFeatureRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
  deltasFor,
} from "@/server/adapt/apply";
import { fingerMapHash } from "@/server/adapt/key-map";
import { extract } from "@/server/adapt/measure";
import { deriveFeatureKeys } from "@/server/adapt/motor-features";
import { advanceRecency, COLD_BIGRAM_THRESHOLD, selectWords } from "@/server/adapt/select";
import {
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  type BigramBaselines,
  DEFAULT_WEIGHTS,
  fatigueDampener,
  inChallengeBand,
  MIN_SAMPLES_FOR_WEAKNESS,
  predictedWordMs,
  recencyMultiplier,
  RECENCY_RECOVERY_TESTS,
  scoreWord,
  UNTESTED_BIGRAM_BONUS,
  weakness,
} from "@/server/adapt/scoring";
import { bigramCategory } from "@/server/adapt/motor-features";
import type { ModelState } from "@/server/adapt/welford";
import {
  ensureHandLayout,
  type HandLayoutPrefs,
} from "@/lib/hand-layout";
import {
  type AdaptModelRow,
  type AdaptSnapshotOutput,
  type RequestWordsInput,
  type RequestWordsOutput,
  type ScoreWordInput,
  type ScoreWordOutput,
  type SubmitTestInput,
  type SubmitTestOutput,
  type WeaknessBreakdown,
  requestWordsInputSchema,
  scoreWordInputSchema,
  submitTestInputSchema,
} from "@/types/adapt";
import type { Database } from "@/db/server";

// ─── Helpers shared by both routes ───────────────────────────────────
//
// The two routes both need the same handful of reads from the
// user_prefs blob — handLayout, adaptRecency, adaptFingerMapHash. The
// prefs blob is opaque to the server (R-shaped JSON), so we cast at
// the boundary. Centralising the casts here keeps the route bodies
// readable and the unsafe code in one place.

type AdaptPrefs = {
  handLayout: HandLayoutPrefs;
  adaptRecency: Map<string, number>;
  adaptFingerMapHash: string | null;
  raw: Record<string, unknown>;
};

async function loadAdaptPrefs(
  db: Database,
  userId: string,
): Promise<AdaptPrefs> {
  const raw = await db.userPrefs.get(userId);
  // ensureHandLayout coerces malformed blobs (legacy shapes,
  // missing fingers map, partial per-finger entries) into a valid
  // layout against DEFAULT_HAND_LAYOUT. Without this the
  // bigramCategory / disabledFingers callsites blow up on older
  // user_prefs rows that pre-date the current shape.
  const layout = ensureHandLayout(raw.handLayout);
  const recency = new Map<string, number>(
    Object.entries(
      (raw.adaptRecency as Record<string, number> | undefined) ?? {},
    ),
  );
  const hash =
    (raw.adaptFingerMapHash as string | undefined | null) ?? null;
  return {
    handLayout: layout,
    adaptRecency: recency,
    adaptFingerMapHash: hash,
    raw,
  };
}

async function persistAdaptPrefs(
  db: Database,
  userId: string,
  prefs: AdaptPrefs,
  patch: { adaptRecency?: Map<string, number>; adaptFingerMapHash?: string },
): Promise<void> {
  const next: Record<string, unknown> = { ...prefs.raw };
  if (patch.adaptRecency)
    next.adaptRecency = Object.fromEntries(patch.adaptRecency);
  if (patch.adaptFingerMapHash !== undefined)
    next.adaptFingerMapHash = patch.adaptFingerMapHash;
  await db.userPrefs.set(userId, next);
}

// ─── adapt.submit ────────────────────────────────────────────────────

const submit = defineRoute<SubmitTestInput, SubmitTestOutput>({
  input: submitTestInputSchema,
  handler: async ({ input, db, meta, log }) => {
    const userId = meta.userId as string;
    const prefs = await loadAdaptPrefs(db, userId);

    // If the user's finger map has changed since the last submit,
    // wipe the motor-feature model — its keys describe a layout
    // that no longer exists. Bigrams and trigrams stay; they're
    // mechanical observations of typed character pairs.
    const currentHash = fingerMapHash(prefs.handLayout);
    const fingerMapChanged =
      prefs.adaptFingerMapHash != null &&
      prefs.adaptFingerMapHash !== currentHash;
    if (fingerMapChanged) {
      log.info("finger map changed — clearing motor-feature model", {
        userId,
      });
      await db.motorFeatureModels.clearForUser(userId);
    }

    const [bigramRows, trigramRows, motorRows, wordRows] = await Promise.all([
      db.bigramModels.listForUser(userId),
      db.trigramModels.listForUser(userId),
      fingerMapChanged
        ? Promise.resolve([])
        : db.motorFeatureModels.listForUser(userId),
      db.wordModels.listForUser(userId),
    ]);
    const bigramStates = bigramRowsToStates(bigramRows);
    const trigramStates = trigramRowsToStates(trigramRows);
    const motorStates = motorFeatureRowsToStates(motorRows);
    const wordStates = wordRowsToStates(wordRows);

    const baselines = {
      bigram: new Map(
        Array.from(bigramStates, ([k, s]) => [k, s.mean] as const),
      ),
      trigram: new Map(
        Array.from(trigramStates, ([k, s]) => [k, s.mean] as const),
      ),
      word: new Map(
        Array.from(wordStates, ([k, s]) => [k, s.mean] as const),
      ),
    };
    const samples = extract(input.timings, prefs.handLayout, baselines);

    await Promise.all([
      db.bigramModels.bulkUpsert(userId, deltasFor(bigramStates, samples.bigrams)),
      db.trigramModels.bulkUpsert(
        userId,
        deltasFor(trigramStates, samples.trigrams),
      ),
      db.motorFeatureModels.bulkUpsert(
        userId,
        deltasFor(motorStates, samples.motorFeatures),
      ),
      db.wordModels.bulkUpsert(
        userId,
        deltasFor(wordStates, samples.words),
      ),
    ]);

    const testId = randomUUID();
    // Look up the prior best for this (mode, length) bucket *before*
    // inserting the new row so the comparison is apples-to-apples and
    // the just-inserted row never appears in its own "previous best"
    // query. We only fire a PB notification for completed runs — a
    // half-finished run isn't a PB regardless of partial WPM.
    const previousWpm = input.wasCompleted
      ? await db.tests.bestBefore(
          userId,
          input.mode,
          input.durationOrWordCount,
          input.startedAt,
        )
      : null;

    await db.tests.insert({
      id: testId,
      userId,
      startedAt: new Date(input.startedAt),
      completedAt: new Date(input.completedAt),
      mode: input.mode,
      durationOrWordCount: input.durationOrWordCount,
      wpm: input.wpm,
      accuracy: input.accuracy,
      errorCount: input.errorCount,
      resetCount: input.resetCount,
      wasCompleted: input.wasCompleted,
    });

    // Personal-best notification — fires when a completed run beats
    // the prior best for the same (mode, length) bucket. The very
    // first completed run in a bucket *also* counts (previousWpm is
    // null), since "first time finishing 60s casual" is itself a
    // milestone worth surfacing. Wrapped in createIfAbsent so a
    // duplicate adapt.submit can't double-fire — the dedupe key is
    // the test row id, which is unique by construction. Failures are
    // swallowed: an analytics notification falling over must never
    // turn a good test submit into a 5xx.
    if (input.wasCompleted && (previousWpm == null || input.wpm > previousWpm)) {
      try {
        await db.notifications.createIfAbsent({
          userId,
          kind: "personal_best",
          title: previousWpm == null ? "First completed run" : "New personal best",
          body: formatPbBody(input, previousWpm),
          data: {
            mode: input.mode,
            durationOrWordCount: input.durationOrWordCount,
            wpm: input.wpm,
            accuracy: input.accuracy,
            previousWpm,
          },
          dedupeKey: `pb:${testId}`,
        });
      } catch (err) {
        log.warn("personal-best notification create failed", {
          userId,
          testId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const nextRecency = advanceRecency(
      prefs.adaptRecency,
      input.words,
      RECENCY_RECOVERY_TESTS,
    );
    await persistAdaptPrefs(db, userId, prefs, {
      adaptRecency: nextRecency,
      adaptFingerMapHash: currentHash,
    });

    return {
      testId,
      measurementsAccepted: samples.accepted,
      measurementsRejected: samples.rejected,
    };
  },
});

// ─── adapt.words ─────────────────────────────────────────────────────

const words = defineRoute<RequestWordsInput, RequestWordsOutput>({
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
      batches.push(r.words);
      if (r.cold) cold = true;
    }

    return { batches, cold };
  },
});

// ─── adapt.snapshot ──────────────────────────────────────────────────
//
// Backs the /biogram visualisation. Reads everything the
// algorithm reads and returns it shaped for display, with weakness
// pre-computed against the user's own baselines so the client never
// has to repeat the math. Bounded by the model size — a fully
// populated user is a ~50KB payload.

const snapshot = defineRoute<void, AdaptSnapshotOutput>({
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

// ─── adapt.scoreWord ─────────────────────────────────────────────────

/** Tighter route-level cap because scoreWord loads four model tables
 *  and walks per-character against word.length² in the breakdown
 *  loop. 30 calls/minute is more than enough for the confidence
 *  playground's debounced lookups (one per typed word) and stops a
 *  scripted caller from grinding the model tables. */
const scoreWordRoute = defineRoute<ScoreWordInput, ScoreWordOutput>({
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

// ─── helpers ─────────────────────────────────────────────────────────

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

/** Compose the body line for a personal-best notification. WORDS
 *  modes show the word count; TIME modes show seconds; QUOTE / other
 *  modes fall back to the raw amount. The previous best is appended
 *  in parens when there was one, so the user can read the delta at a
 *  glance ("Casual 60s · 102 wpm · 98% acc (previous best 92)"). */
function formatPbBody(
  input: SubmitTestInput,
  previousWpm: number | null,
): string {
  const lengthLabel = formatLength(input.mode, input.durationOrWordCount);
  const modeLabel = input.mode === "training" ? "Training" : "Casual";
  const head = `${modeLabel} ${lengthLabel} · ${Math.round(input.wpm)} wpm · ${input.accuracy.toFixed(1)}% acc`;
  if (previousWpm == null) return head;
  const delta = Math.round(input.wpm - previousWpm);
  const deltaTail =
    delta > 0 ? ` (previous best ${Math.round(previousWpm)} · +${delta})` : ` (previous best ${Math.round(previousWpm)})`;
  return head + deltaTail;
}

function formatLength(mode: string, amount: number): string {
  // Time-mode lengths read as seconds; everything else as a count.
  if (mode === "time" || (typeof amount === "number" && amount >= 5 && amount <= 600 && /time/i.test(mode))) {
    return `${amount}s`;
  }
  return String(amount);
}

/** Namespace-wide budget — 120 requests/minute is comfortably above
 *  a focused practice session (one /words + one /submit + a /snapshot
 *  read every ~5s) and well below what a scripted abuser would push.
 *  Individual expensive routes layer tighter caps on top so a hot
 *  scoreWord loop can't drain the namespace bucket. */
export const adapt = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 120, windowMs: 60_000 })],
  routes: { submit, words, snapshot, scoreWord: scoreWordRoute },
});
