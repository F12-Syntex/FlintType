import type { TestRow } from "@/types/adapt";

/** Difficulty pacing — how hard the next passage should be, given how
 *  the user is doing *right now*.
 *
 *  Before this module, "fatigue" was a [0.9, 1] multiplier applied to
 *  every candidate's weight. Because it scaled every candidate by the
 *  same constant, the weighted pick was unchanged: tiredness had no
 *  effect at all. Pacing instead changes the *shape* of the selection:
 *
 *   - the challenge band's ceiling (how much slower than your baseline
 *     a word may be predicted to take) drops when you're tired or
 *     error-prone and rises a little when you're in form;
 *   - the weakness concentration exponent softens when you're
 *     struggling (spread practice over moderate weaknesses rather than
 *     hammering the worst ones) and sharpens when you're fresh.
 *
 *  Signals come from the recent test stream: the WPM trend within the
 *  current session (fatigue), session accuracy (strain), and session
 *  speed vs your usual speed (slump / good form). */

/** Challenge band: words whose predicted time lands in
 *  [baseline × LOW, baseline × high] are the productive zone. See
 *  `inChallengeBand`. HIGH is the neutral ceiling; pacing moves it
 *  between HIGH_TIRED and HIGH_FRESH. The neutral 2.6× is deliberately
 *  generous: adaptive mode exists to serve your *worst* words, which
 *  predict well past your average (an earlier 1.6× ceiling silently
 *  excluded them and made the mode feel too easy), while still keeping
 *  the pathological 3×+ outliers out. */
export const CHALLENGE_LOW = 1.05;
export const CHALLENGE_HIGH = 2.6;
export const CHALLENGE_HIGH_TIRED = 1.9;
export const CHALLENGE_HIGH_FRESH = 3.0;

/** Exponent applied to a candidate's weakness score before the
 *  weighted-random pick. The raw score is roughly linear in "how much
 *  slower than baseline this word is", so a flat pick over ~200
 *  candidates barely concentrates on the weakest; > 1 sharpens it so
 *  your actual worst words dominate (at 1.8 a word 3× weaker is ~7× as
 *  likely). Pacing moves it between TIRED (spread out) and FRESH. */
export const WEAKNESS_CONCENTRATION = 1.8;
export const CONCENTRATION_TIRED = 1.3;
export const CONCENTRATION_FRESH = 2.1;

/** Tests further apart than this start a new session. */
export const SESSION_GAP_MS = 30 * 60_000;

/** Fatigue: decline of the newest session tests' WPM vs the older ones,
 *  as a multiplier in [FATIGUE_MIN_MULT, 1] (1 = no decline, the floor
 *  = a 10%+ decline). Needs FATIGUE_TESTS tests. */
export const FATIGUE_MIN_MULT = 0.9;
export const FATIGUE_TESTS = 5;

/** Session accuracy below TARGET counts as strain, reaching full strain
 *  SPAN points lower (94% → none, 88% → full). */
export const ACCURACY_TARGET = 94;
export const ACCURACY_SPAN = 6;

/** Session speed vs usual: a SLUMP_SPAN drop is full strain; a
 *  LIFT_SPAN gain (with accuracy on target) is full good form. */
export const SLUMP_SPAN = 0.15;
export const LIFT_SPAN = 0.1;
/** Usual speed needs this many completed tests to be meaningful. */
export const USUAL_MIN_TESTS = 6;

/** Good form is capped well below the strain range: being in form
 *  should stretch you a little, never make practice brutal. */
export const FORM_MAX = 0.5;

export type Pacing = {
  /** −1 (tired / struggling) … FORM_MAX (in form). 0 = neutral. */
  form: number;
  /** Upper bound of the challenge band for this request. */
  challengeHigh: number;
  /** Weakness concentration exponent for this request. */
  concentration: number;
  /** challengeHigh / CHALLENGE_HIGH capped at 1 — the "easing off"
   *  figure the /biogram overview shows. */
  damping: number;
};

export const NEUTRAL_PACING: Pacing = {
  form: 0,
  challengeHigh: CHALLENGE_HIGH,
  concentration: WEAKNESS_CONCENTRATION,
  damping: 1,
};

export function fatigueDampener(recent: readonly TestRow[]): number {
  if (recent.length < FATIGUE_TESTS) return 1;
  const slice = recent.slice(0, FATIGUE_TESTS);
  // recent[0] is newest. Compare the newer half against the older one.
  const half = Math.ceil(FATIGUE_TESTS / 2);
  const newestAvg = avgWpm(slice.slice(0, half));
  const olderAvg = avgWpm(slice.slice(half));
  if (olderAvg <= 0) return 1;
  const decline = (olderAvg - newestAvg) / olderAvg;
  if (decline <= 0) return 1;
  // 0% decline → 1.0, 10% or more decline → 0.9. Linear in between.
  return Math.max(FATIGUE_MIN_MULT, 1 - Math.min(0.1, decline));
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

/** Derive this request's pacing from the newest-first test stream. */
export function pacingFrom(
  recent: readonly TestRow[],
  nowMs?: number,
): Pacing {
  const session = currentSession(recent, nowMs);
  if (session.length < 2) return NEUTRAL_PACING;

  const fatigue =
    (1 - fatigueDampener(session)) / (1 - FATIGUE_MIN_MULT);

  const accSlice = session.slice(0, FATIGUE_TESTS);
  const sessionAcc = accSlice.reduce((a, t) => a + t.accuracy, 0) / accSlice.length;
  const strain = clamp01((ACCURACY_TARGET - sessionAcc) / ACCURACY_SPAN);

  let slump = 0;
  let lift = 0;
  const done = recent.filter((t) => t.wasCompleted);
  if (done.length >= USUAL_MIN_TESTS) {
    const usual = avgWpm(done);
    const now = avgWpm(session.slice(0, 3));
    if (usual > 0) {
      const change = (now - usual) / usual;
      slump = clamp01(-change / SLUMP_SPAN);
      lift = clamp01(change / LIFT_SPAN);
    }
  }

  const struggle = Math.max(fatigue, strain, slump);
  const form = struggle > 0 ? -struggle : lift * FORM_MAX;
  return pacingForForm(form);
}

/** Map a form value onto band ceiling + concentration. Exported so the
 *  mapping is testable on its own. */
export function pacingForForm(form: number): Pacing {
  const f = Math.max(-1, Math.min(FORM_MAX, form));
  if (f === 0) return NEUTRAL_PACING;
  const t = f < 0 ? -f : f / FORM_MAX;
  const challengeHigh =
    f < 0
      ? lerp(CHALLENGE_HIGH, CHALLENGE_HIGH_TIRED, t)
      : lerp(CHALLENGE_HIGH, CHALLENGE_HIGH_FRESH, t);
  const concentration =
    f < 0
      ? lerp(WEAKNESS_CONCENTRATION, CONCENTRATION_TIRED, t)
      : lerp(WEAKNESS_CONCENTRATION, CONCENTRATION_FRESH, t);
  return {
    form: f,
    challengeHigh,
    concentration,
    damping: Math.min(1, challengeHigh / CHALLENGE_HIGH),
  };
}

/** Challenge-band gate. Words whose predicted typing time falls in
 *  [baseline × low, baseline × high] (per bigram) are the productive
 *  zone — slower than your average, not so slow you stall. Cold start
 *  (no baseline) and zero-bigram words always pass. */
export function inChallengeBand(
  predictedMs: number,
  userBaselineMsPerBigram: number,
  bigramCount: number,
  high: number = CHALLENGE_HIGH,
  low: number = CHALLENGE_LOW,
): boolean {
  if (bigramCount === 0 || userBaselineMsPerBigram === 0) return true;
  const expected = userBaselineMsPerBigram * bigramCount;
  if (expected === 0) return true;
  const ratio = predictedMs / expected;
  return ratio >= low && ratio <= high;
}

function avgWpm(rows: readonly TestRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((a, t) => a + t.wpm, 0) / rows.length;
}

function clamp01(v: number): number {
  if (!(v > 0)) return 0;
  return Math.min(1, v);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
