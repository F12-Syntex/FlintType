import type { Logger } from "@/server/logger";
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
import type { SubmitTestInput } from "@/types/adapt";

/** Throws `BackendError(400, 'VALIDATION')` when a completed run's
 *  claimed wpm isn't supported by its own keystroke payload. Extracted
 *  verbatim from `adapt.submit` (which runs it before writing anything)
 *  to keep that route under the file-length threshold. */
export function assertPlausibleRun(
  input: SubmitTestInput,
  log: Logger,
  userId: string,
): void {
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
}
