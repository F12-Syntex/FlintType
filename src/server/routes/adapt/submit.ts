import { randomUUID } from "node:crypto";
import { defineRoute } from "@/server";
import {
  bigramRowsToStates,
  deltasFor,
  motorFeatureRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { fingerMapHash } from "@/server/adapt/key-map";
import { extract } from "@/server/adapt/measure";
import { advanceRecency, RECENCY_RECOVERY_TESTS } from "@/server/adapt/recency";
import { baselineMean } from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import {
  submitTestInputSchema,
  type SubmitTestInput,
  type SubmitTestOutput,
} from "@/types/adapt";
import { notifyPersonalBest } from "./pb-notify";
import { assertPlausibleRun } from "./plausibility";
import { loadAdaptPrefs, persistAdaptPrefs } from "./prefs";

export const submit = defineRoute<SubmitTestInput, SubmitTestOutput>({
  input: submitTestInputSchema,
  handler: async ({ input, db, meta, log }) => {
    const userId = meta.userId as string;

    // Plausibility gate (issue #38) — see plausibility.ts.
    assertPlausibleRun(input, log, userId);

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

    // Pre-submit cold flag — total bigram samples in the model BEFORE
    // we fold this run's deltas in. Used downstream to gate the PB
    // notification on training-mode runs: until the algorithm has
    // ~200 samples, the curated word pool is still mostly random and
    // a "PB" off it isn't a meaningful claim.
    const totalBigramSamples = bigramRows.reduce(
      (s, r) => s + r.sampleCount,
      0,
    );
    const wasCold = totalBigramSamples < COLD_BIGRAM_THRESHOLD;

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
      // Scales the cost charged for each fumbled pair (slips.ts) — the
      // user's overall pace, not the pair's own mean, so a pair's error
      // cost can't feed back into itself.
      overallBigram: baselineMean(bigramStates),
    };
    const samples = extract(input.timings, prefs.handLayout, baselines);

    // Behaviour-pref opt-out: when the user has flipped
    // `excludeCasualFromAdapt`, casual-mode tests skip the model
    // update entirely. The test row + PB still record (those are
    // user-facing history), but the bigram / trigram / motor-feature
    // / word models stay frozen for that run. Training and race runs
    // always contribute regardless of the toggle.
    const behaviour =
      (prefs.raw.behaviour as
        | { excludeCasualFromAdapt?: boolean }
        | undefined) ?? {};
    const skipAdaptUpdate =
      input.mode === "casual" && behaviour.excludeCasualFromAdapt === true;

    if (!skipAdaptUpdate) {
      // Clean timings and mistake costs fold into the same running
      // means (effective time per attempt); `nowMs` lets long-unseen
      // patterns re-learn quickly. Words stay clean-only.
      const nowMs = Date.now();
      const { slips } = samples;
      await Promise.all([
        db.bigramModels.bulkUpsert(
          userId,
          deltasFor(bigramStates, samples.bigrams, {
            slips: slips.bigrams,
            nowMs,
          }),
        ),
        db.trigramModels.bulkUpsert(
          userId,
          deltasFor(trigramStates, samples.trigrams, {
            slips: slips.trigrams,
            nowMs,
          }),
        ),
        db.motorFeatureModels.bulkUpsert(
          userId,
          deltasFor(motorStates, samples.motorFeatures, {
            slips: slips.motorFeatures,
            nowMs,
          }),
        ),
        db.wordModels.bulkUpsert(
          userId,
          deltasFor(wordStates, samples.words, { nowMs }),
        ),
      ]);
    }

    const testId = randomUUID();
    // PB eligibility — a completed run is eligible for the PB
    // notification UNLESS it was a training-mode run that landed
    // while the algorithm was still cold (`totalBigramSamples < 200`
    // before this run's deltas). Training while cold serves a
    // near-random word selection, so a "PB" off it would
    // misrepresent the user's real ceiling — wait for the model to
    // warm up before celebrating training PBs.
    const pbEligible =
      input.wasCompleted && !(input.mode === "training" && wasCold);
    const previousWpm = pbEligible
      ? await db.tests.bestBefore(
          userId,
          input.mode,
          input.durationOrWordCount,
          input.lengthMode ?? null,
          input.startedAt,
        )
      : null;
    // Authoritative PB flag — the very same condition that gates the
    // personal-best notification below. Returned to the client so the
    // results-screen crown is driven by the user's true history, not a
    // per-browser localStorage guess that crowns every first-of-its-kind
    // run (and re-crowns after a cache clear).
    const isPersonalBest =
      pbEligible && (previousWpm == null || input.wpm > previousWpm);

    await db.tests.insert({
      id: testId,
      userId,
      startedAt: new Date(input.startedAt),
      completedAt: new Date(input.completedAt),
      mode: input.mode,
      durationOrWordCount: input.durationOrWordCount,
      lengthMode: input.lengthMode ?? null,
      wpm: input.wpm,
      accuracy: input.accuracy,
      errorCount: input.errorCount,
      resetCount: input.resetCount,
      wasCompleted: input.wasCompleted,
      // Persist the live-chart payload so /share/<slug> can render
      // the same results-screen layout the user saw post-test. All
      // optional — older / non-practice submit paths (race, drills)
      // may not include them, which is fine; the share renderer
      // falls back when the columns are null.
      rawWpm: input.rawWpm ?? null,
      peakWpm: input.peakWpm ?? null,
      avgWpm: input.avgWpm ?? null,
      stallWpm: input.stallWpm ?? null,
      consistency: input.consistency ?? null,
      wpmHistory: input.wpmHistory ?? null,
    });

    // Personal-best notification + follower fan-out (pb-notify.ts).
    // Never throws — a notification failure can't fail the submit.
    if (isPersonalBest) {
      await notifyPersonalBest({ db, log, userId, testId, input, previousWpm });
    }

    const nextRecency = advanceRecency(
      prefs.adaptRecency,
      input.words,
      RECENCY_RECOVERY_TESTS,
    );
    await persistAdaptPrefs(db, userId, {
      adaptRecency: nextRecency,
      adaptFingerMapHash: currentHash,
    });

    return {
      testId,
      measurementsAccepted: samples.accepted,
      measurementsRejected: samples.rejected,
      isPersonalBest,
      previousBest: previousWpm,
    };
  },
});
