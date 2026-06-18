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
import {
  RECENCY_RECOVERY_TESTS,
} from "@/server/adapt/scoring";
import { advanceRecency, COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import { resolveUserDisplays } from "@/server/user-display";
import { BackendError } from "@/lib/errors";
import {
  MAX_PLAUSIBLE_WPM,
  MIN_COMPLETED_RUN_MS,
  WPM_VERIFY_FLOOR,
  keystrokeRateWpm,
  keystrokeSpanMs,
  maxCredibleWpm,
  submittedCharVolume,
  timingsConsistent,
} from "@/lib/wpm-limits";
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

    // ── Plausibility gate (issue #38) ────────────────────────────────
    // Completed runs are leaderboard-eligible (the global board ranks
    // wpm × accuracy over wasCompleted=true rows) and fire PB / friend
    // fan-outs — so the claimed wpm must be supported by the run's
    // verifiable payload before anything is written. The check applies
    // to EVERY mode, including "race": the legit race path (the single
    // practice-state submit call site) ships full words + timings like
    // any other run, so the race tag gets the same protection without
    // a special case. Below WPM_VERIFY_FLOOR the check is skipped —
    // slow rows are no leaderboard threat and sparse payloads at the
    // low end must never bounce an honest run. Clear forgeries are
    // rejected outright (not flagged) so they leave no row at all.
    //
    // The ceiling is derived from the KEYSTROKE STREAM (`timings`), not
    // from the client `words` array. `words` is client-controlled and
    // unverified against any server-served passage, so padding it used
    // to be enough to inflate the volume past the ceiling while POSTing
    // a single fabricated number with an empty `timings`. Deriving the
    // ceiling exclusively from `timings` removes that vector. Three
    // independent checks then gate a fast completed run:
    //   1. elapsed ≥ MIN_COMPLETED_RUN_MS — a sub-half-second "run"
    //      can't be honest above 40 wpm and would explode the volume
    //      ceiling (the elapsed-compression bypass).
    //   2. the keystroke stream's intrinsic rate (volume over the span
    //      the keystrokes themselves cover) ≤ MAX_PLAUSIBLE_WPM — a
    //      stream that packs its volume into a thin time slice (all-
    //      equal `t`, or a tiny span) is physically impossible, however
    //      the elapsed is set (the time-compression / all-t=0 bypass).
    //   3. the claimed wpm ≤ the volume-over-elapsed ceiling — the core
    //      "you can't have typed more than the keystrokes you sent".
    // Together these raise the bar from "POST one number" (or "pad with
    // all-zero timings") to "fabricate a keystroke array that is
    // monotonic, spans the claimed elapsed, AND whose overall rate
    // (volume over its own span) stays under the human cap".
    //
    // RESIDUAL RISK (follow-up): this is defense-in-depth, not a closed
    // door. The checks bound the stream's GLOBAL rate, not its per-key
    // distribution — so a forger who knows the arithmetic can still
    // hand-craft a timings array (e.g. mostly clustered, one entry
    // anchoring the span to ~the elapsed) that satisfies all four checks
    // and claims up to the MAX_PLAUSIBLE_WPM (500) hard cap. That cap is
    // itself a visibly-superhuman leaderboard value, so the practical
    // escalation is bounded, not unbounded. Fully closing fabrication
    // requires a server-issued passage/keystroke session token that ties
    // the submitted stream to a passage the server actually served (a
    // signed passage session) — tracked as a separate follow-up, out of
    // scope for this PR.
    //
    // LEGIT-SAFETY: a hard reject (not a board-exclude) is safe here
    // because the only client submit path (practice-state.tsx →
    // adapt.submit, shared by practice, quote, and race) ALWAYS ships
    // `timings: state.events`, one keystroke entry per typed character,
    // for every completed run. There is no honest completed run above
    // the verify floor with an empty/sparse stream, so empty/inconsistent
    // timings on a >40-wpm completed run is forgery, not a false alarm.
    if (input.wasCompleted) {
      const elapsedMs = input.completedAt - input.startedAt;
      if (elapsedMs <= 0) {
        throw new BackendError(
          400,
          "VALIDATION",
          "completedAt must be after startedAt for a completed run",
        );
      }
      if (input.wpm > WPM_VERIFY_FLOOR) {
        if (elapsedMs < MIN_COMPLETED_RUN_MS) {
          log.warn("implausibly short completed run rejected", {
            userId,
            wpm: input.wpm,
            elapsedMs,
            mode: input.mode,
          });
          throw new BackendError(
            400,
            "VALIDATION",
            "completed run is too short to be credible",
            { wpm: input.wpm, elapsedMs },
          );
        }
        if (!timingsConsistent(input.timings, elapsedMs)) {
          log.warn("inconsistent keystroke timings rejected", {
            userId,
            wpm: input.wpm,
            elapsedMs,
            keystrokes: input.timings.length,
            mode: input.mode,
          });
          throw new BackendError(
            400,
            "VALIDATION",
            "submitted keystroke timings are inconsistent with the run",
            { wpm: input.wpm },
          );
        }
        const volume = submittedCharVolume(input.timings);
        const spanMs = keystrokeSpanMs(input.timings);
        const keystrokeRate = keystrokeRateWpm(volume, spanMs);
        if (keystrokeRate > MAX_PLAUSIBLE_WPM) {
          // keystrokeRate is Infinity when spanMs is 0 (all-t=0 padding);
          // JSON.stringify turns Infinity into null, so report a finite
          // diagnostic (the raw `volume`/`spanMs` below disambiguate it).
          const keystrokeRateFigure = Number.isFinite(keystrokeRate)
            ? Math.round(keystrokeRate)
            : null;
          log.warn("implausible keystroke density rejected", {
            userId,
            wpm: input.wpm,
            keystrokeRate: keystrokeRateFigure,
            volume,
            spanMs,
            mode: input.mode,
          });
          throw new BackendError(
            400,
            "VALIDATION",
            "submitted keystrokes are packed too tightly to be credible",
            { wpm: input.wpm, keystrokeRate: keystrokeRateFigure },
          );
        }
        const credible = maxCredibleWpm(volume, elapsedMs);
        if (input.wpm > credible) {
          log.warn("implausible wpm claim rejected", {
            userId,
            wpm: input.wpm,
            credible,
            volume,
            elapsedMs,
            mode: input.mode,
          });
          throw new BackendError(
            400,
            "VALIDATION",
            "claimed wpm is not supported by the submitted run data",
            { wpm: input.wpm, maxCredibleWpm: credible },
          );
        }
      }
    }

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
