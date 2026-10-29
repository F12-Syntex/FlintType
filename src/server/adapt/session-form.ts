import { SESSION_GAP_MS, runBucketKey, toBucketSpec } from "@/lib/test-bucket";
import type { TestRow } from "@/types/adapt";

/** How the user is doing *right now*, read from their recent tests —
 *  the input to difficulty pacing (`pacing.ts`).
 *
 *  Runs are only ever compared like for like. A 15-second test is
 *  faster than a 60-second one, a casual passage is faster than an
 *  adaptive one (adaptive words are your weak ones, by design), and a
 *  race has its own rhythm. Comparing across those read a user who
 *  switched from casual to adaptive practice as "slumping" and one who
 *  moved from 15s to 60s tests as "tired". So every comparison happens
 *  inside a bucket of the same mode, length unit and length
 *  (`runBucketKey` in `src/lib/test-bucket.ts`), and accuracy is
 *  judged against the user's own norm for that bucket rather than a
 *  fixed target — a steady 91% learner
 *  isn't struggling, that's just their level.
 *
 *  Small changes are ignored (`*_NOISE`): a few percent of WPM or a
 *  point or two of accuracy is ordinary test-to-test variation. */

/** Fatigue: the newest session tests' speed vs the older ones (each
 *  relative to its own bucket). Needs FATIGUE_TESTS tests. A decline
 *  under FATIGUE_NOISE is noise; FATIGUE_FULL or more is full fatigue. */
export const FATIGUE_TESTS = 5;
export const FATIGUE_NOISE = 0.03;
export const FATIGUE_FULL = 0.1;

/** Strain: session accuracy below the user's usual accuracy for the
 *  same kind of run. ACCURACY_NOISE points is noise; ACCURACY_SPAN
 *  points below usual is full strain. Independently, accuracy under
 *  ACCURACY_FLOOR always counts (full strain ACCURACY_SPAN points lower)
 *  — a safety net for a first session or a run of very sloppy tests. */
export const ACCURACY_NOISE = 1.5;
export const ACCURACY_SPAN = 6;
export const ACCURACY_FLOOR = 85;

/** Session speed vs usual speed for the same kind of run: a SLUMP_SPAN
 *  drop is full strain; a LIFT_SPAN gain is full good form. Changes
 *  under SPEED_NOISE are ignored. */
export const SPEED_NOISE = 0.03;
export const SLUMP_SPAN = 0.15;
export const LIFT_SPAN = 0.1;

/** A "usual" reference for a bucket needs this many completed runs of
 *  that bucket from before the current session. */
export const USUAL_MIN_TESTS = 3;

/** Each signal in [0, 1]. */
export type FormSignals = {
  fatigue: number;
  strain: number;
  slump: number;
  lift: number;
};

export const NO_SIGNALS: FormSignals = { fatigue: 0, strain: 0, slump: 0, lift: 0 };

/** Which runs are comparable: same mode, same length unit, same length.
 *  Stored test rows carry no input kind, so the touch suffix never applies. */
function runBucket(t: TestRow): string {
  return runBucketKey(toBucketSpec(t), false);
}

/** The completed tests of the session the user is in, newest first.
 *  A session is a chain of tests each starting within SESSION_GAP_MS of
 *  the next. With `nowMs`, a session whose newest test is older than
 *  the gap is over → []. Aborted runs are skipped: their WPM is a few
 *  words' worth of noise. */
export function currentSession(
  recent: readonly TestRow[],
  nowMs?: number,
): TestRow[] {
  const done = recent.filter((t) => t.wasCompleted);
  if (done.length === 0) return [];
  const newest = done[0]!.startedAt.getTime();
  if (nowMs != null && nowMs - newest > SESSION_GAP_MS) return [];
  const out: TestRow[] = [done[0]!];
  for (let i = 1; i < done.length; i++) {
    const gap = out[out.length - 1]!.startedAt.getTime() - done[i]!.startedAt.getTime();
    if (gap > SESSION_GAP_MS) break;
    out.push(done[i]!);
  }
  return out;
}

/** Read the four form signals from a newest-first test stream. */
export function sessionSignals(
  recent: readonly TestRow[],
  nowMs?: number,
): FormSignals {
  const session = currentSession(recent, nowMs);
  if (session.length < 2) return NO_SIGNALS;
  const done = recent.filter((t) => t.wasCompleted);
  // `session` is a prefix of `done`; everything after it is history.
  const usual = usualByBucket(done.slice(session.length));

  const fatigue = ramp(sessionDecline(session, done), FATIGUE_NOISE, FATIGUE_FULL);

  const accSlice = session.slice(0, FATIGUE_TESTS);
  const sessionAcc = mean(accSlice.map((t) => t.accuracy));
  const deficit = mean(
    accSlice.flatMap((t) => {
      const u = usual.get(runBucket(t));
      return u ? [u.accuracy - t.accuracy] : [];
    }),
  );
  const strain = Math.max(
    ramp(deficit, ACCURACY_NOISE, ACCURACY_SPAN),
    clamp01((ACCURACY_FLOOR - sessionAcc) / ACCURACY_SPAN),
  );

  const change = mean(
    session.slice(0, 3).flatMap((t) => {
      const u = usual.get(runBucket(t));
      return u && u.wpm > 0 ? [t.wpm / u.wpm - 1] : [];
    }),
  );
  return {
    fatigue,
    strain,
    slump: ramp(-change, SPEED_NOISE, SLUMP_SPAN),
    lift: ramp(change, SPEED_NOISE, LIFT_SPAN),
  };
}

/** Relative decline of the newest half of the session's first
 *  FATIGUE_TESTS tests against the older half. Each run's WPM is taken
 *  relative to its bucket's median across the window, so mixing test
 *  lengths or modes inside a session reads as no change, not fatigue. */
function sessionDecline(session: readonly TestRow[], done: readonly TestRow[]): number {
  if (session.length < FATIGUE_TESTS) return 0;
  const medians = new Map<string, number>();
  for (const [bucket, rows] of groupByBucket(done)) {
    medians.set(bucket, median(rows.map((t) => t.wpm)));
  }
  const rel = session.slice(0, FATIGUE_TESTS).map((t) => {
    const m = medians.get(runBucket(t)) ?? 0;
    return m > 0 ? t.wpm / m : 1;
  });
  const half = Math.ceil(FATIGUE_TESTS / 2);
  const newer = mean(rel.slice(0, half));
  const older = mean(rel.slice(half));
  return older > 0 ? (older - newer) / older : 0;
}

/** Median WPM + mean accuracy per bucket, for buckets with at least
 *  USUAL_MIN_TESTS runs. */
function usualByBucket(
  history: readonly TestRow[],
): Map<string, { wpm: number; accuracy: number }> {
  const out = new Map<string, { wpm: number; accuracy: number }>();
  for (const [bucket, rows] of groupByBucket(history)) {
    if (rows.length < USUAL_MIN_TESTS) continue;
    out.set(bucket, {
      wpm: median(rows.map((t) => t.wpm)),
      accuracy: mean(rows.map((t) => t.accuracy)),
    });
  }
  return out;
}

function groupByBucket(rows: readonly TestRow[]): Map<string, TestRow[]> {
  const out = new Map<string, TestRow[]>();
  for (const t of rows) {
    const key = runBucket(t);
    const list = out.get(key);
    if (list) list.push(t);
    else out.set(key, [t]);
  }
  return out;
}

/** 0 below `noise`, rising linearly to 1 at `full`. */
function ramp(v: number, noise: number, full: number): number {
  return clamp01((v - noise) / (full - noise));
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function clamp01(v: number): number {
  if (!(v > 0)) return 0;
  return Math.min(1, v);
}
