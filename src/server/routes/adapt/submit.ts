import { randomUUID } from "node:crypto";
import { BackendError } from "@/lib/errors";
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
import {
  RECENCY_RECOVERY_TESTS,
} from "@/server/adapt/scoring";
import { advanceRecency, COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import { resolveUserDisplays } from "@/server/user-display";
import {
  submitTestInputSchema,
  type SubmitTestInput,
  type SubmitTestOutput,
} from "@/types/adapt";
import type { FriendPbNotificationData } from "@/types/notification";
import { loadAdaptPrefs, persistAdaptPrefs } from "./prefs";

export const submit = defineRoute<SubmitTestInput, SubmitTestOutput>({
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

    // Physical-plausibility guard: a reported WPM can never exceed what
    // the run's own keystrokes allow — (keystrokes / 5) over the span the
    // keystrokes actually took. Real practice/drill/race submits carry
    // the genuine per-keystroke `timings` (and a WPM derived from them),
    // so reported ≤ bound always; this rejects only forged payloads —
    // notably the trivial `{ wpm: 9999, timings: [] }` POST that
    // otherwise crowns rank 1 on the leaderboard. The Zod
    // `MAX_PLAUSIBLE_WPM` cap is the coarse first line; this is the
    // per-run check. Generous tolerance (1.3x + 10) so honest runs never
    // trip it.
    if (input.wasCompleted && input.wpm > 0) {
      const keystrokes = input.timings.length;
      const first = input.timings[0]?.t ?? 0;
      const last = input.timings[keystrokes - 1]?.t ?? 0;
      const spanMs = last - first;
      const reject = (reason: string) => {
        log.warn("rejected implausible test submit", {
          userId,
          claimedWpm: input.wpm,
          keystrokes,
          spanMs,
        });
        throw new BackendError(400, "VALIDATION", reason);
      };
      if (keystrokes === 0) {
        reject("completed run reports a WPM with no keystrokes");
      } else if (spanMs <= 0) {
        reject("run keystrokes have a non-positive time span");
      } else {
        const maxWpm = keystrokes / 5 / (spanMs / 60000);
        if (input.wpm > maxWpm * 1.3 + 10) {
          reject(
            "reported wpm exceeds what the run's keystrokes and timing allow",
          );
        }
      }
    }

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

    // Personal-best notification — fires when a completed run beats
    // the prior best for the same (mode, length) bucket. The very
    // first completed run in a bucket *also* counts (previousWpm is
    // null), since "first time finishing 60s casual" is itself a
    // milestone worth surfacing. Wrapped in createIfAbsent so a
    // duplicate adapt.submit can't double-fire — the dedupe key is
    // the test row id, which is unique by construction. Failures are
    // swallowed: an analytics notification falling over must never
    // turn a good test submit into a 5xx.
    if (isPersonalBest) {
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

      // Fan the PB out to the user's followers — "a friend hit a PB",
      // the social half of the activity feed. Its own try so a Clerk
      // hiccup, zero followers, or anything else here can never turn a
      // good submit into a 5xx. Deduped on the run id so a follower
      // gets at most one row per PB.
      try {
        const followers = await db.follows.listFollowers(userId);
        if (followers.length > 0) {
          const displays = await resolveUserDisplays(db, [userId]);
          const me = displays.get(userId);
          const name = me?.name ?? "A friend";
          const where = formatLength(input.mode, input.durationOrWordCount);
          await Promise.all(
            followers.map((f) =>
              db.notifications.createIfAbsent({
                userId: f.userId,
                kind: "friend_pb",
                title: "A friend hit a personal best",
                body: `${name} hit ${Math.round(input.wpm)} wpm on ${where}.`,
                data: {
                  friendId: userId,
                  friendName: name,
                  friendUsername: me?.username ?? null,
                  mode: input.mode,
                  durationOrWordCount: input.durationOrWordCount,
                  wpm: input.wpm,
                  accuracy: input.accuracy,
                } satisfies FriendPbNotificationData,
                dedupeKey: `friend_pb:${testId}`,
              }),
            ),
          );
        }
      } catch (err) {
        log.warn("friend-pb fan-out failed", {
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
      isPersonalBest,
      previousBest: previousWpm,
    };
  },
});

/** Compose the body line for a personal-best notification. WORDS
 *  modes show the word count; TIME modes show seconds; QUOTE / other
 *  modes fall back to the raw amount. The previous best is appended
 *  in parens when there was one, so the user can read the delta at a
 *  glance ("Casual 60s · 102 wpm · 98% acc (previous best 92)"). */
export function formatPbBody(
  input: SubmitTestInput,
  previousWpm: number | null,
): string {
  const lengthLabel = formatLength(input.mode, input.durationOrWordCount);
  const modeLabel = input.mode === "training" ? "Training" : "Casual";
  const head = `${modeLabel} ${lengthLabel} · ${Math.round(input.wpm)} wpm · ${input.accuracy.toFixed(1)}% acc`;
  if (previousWpm == null) return head;
  // Derive the delta from the ROUNDED figures the user sees, not from
  // the raw difference — otherwise round(new) − round(prev) can disagree
  // with the displayed "+N" (e.g. 160 shown, 156 shown, but +5 from the
  // unrounded gap). Now 160 − 156 == +4 always reconciles (#12).
  const delta = Math.round(input.wpm) - Math.round(previousWpm);
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
