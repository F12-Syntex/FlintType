import type { ScoreWordOutput } from "@/types/adapt";

/** Pure maths behind the confidence playground. Kept out of the React
 *  module so it can be unit-tested (ui-law §1.3 exception).
 *
 *  `adapt.scoreWord` returns `predictedMs` as the WHOLE word's predicted
 *  typing time: the sum of its (length − 1) letter-to-letter transitions
 *  (`predictedWordMs` in `src/server/adapt/scoring.ts`). It is not a
 *  per-keystroke figure, so the WPM conversion has to divide by the
 *  transition count, not multiply by the word length. */

type Scored = Pick<ScoreWordOutput, "predictedMs" | "inChallengeBand">;

/** 1 WPM = 5 keystrokes per minute, so a keystroke every `m` ms is
 *  60_000 / (5 · m) = 12_000 / m WPM. */
const WPM_PER_INV_MS = 12_000;

/** Letter-to-letter transitions in a word (the unit predictedMs sums). */
export function transitionsIn(word: string): number {
  return Math.max(0, word.length - 1);
}

/** Predicted WPM for one word, or null when there is nothing to
 *  predict (a one-letter word has no transitions; predictedMs is 0). */
export function predictedWordWpm(
  word: string,
  predictedMs: number,
): number | null {
  const t = transitionsIn(word);
  if (t === 0 || !(predictedMs > 0)) return null;
  return (WPM_PER_INV_MS * t) / predictedMs;
}

/** Whether a word should be painted as a challenge word. The server
 *  flags every word as "in band" when it can't judge (cold model, or a
 *  one-letter word), so the band only counts when the model is warm and
 *  the word has at least one transition. */
export function isChallengeWord(
  word: string,
  score: Scored,
  bandActive: boolean,
): boolean {
  return bandActive && transitionsIn(word) > 0 && score.inChallengeBand;
}

export type PlaygroundSummary = {
  /** Words (occurrences) with a score back from the server. */
  scored: number;
  /** Transition-weighted predicted WPM across every scored word, or
   *  null when no scored word has a transition. Agrees with the chips:
   *  it is the harmonic mean of their per-word WPMs, weighted by length. */
  predictedWpm: number | null;
  /** Occurrences painted as challenge words. */
  challenge: number;
};

export function summarisePlayground(
  words: readonly string[],
  scores: Readonly<Record<string, Scored>>,
  bandActive: boolean,
): PlaygroundSummary {
  let scored = 0;
  let challenge = 0;
  let totalMs = 0;
  let totalTransitions = 0;
  for (const w of words) {
    const s = scores[w];
    if (!s) continue;
    scored += 1;
    const t = transitionsIn(w);
    if (t > 0 && s.predictedMs > 0) {
      totalMs += s.predictedMs;
      totalTransitions += t;
    }
    if (isChallengeWord(w, s, bandActive)) challenge += 1;
  }
  const predictedWpm =
    totalTransitions > 0 && totalMs > 0
      ? (WPM_PER_INV_MS * totalTransitions) / totalMs
      : null;
  return { scored, predictedWpm, challenge };
}

/** Split free text into the lowercase words the playground scores.
 *  Capped so one paste can't fan out into dozens of requests. */
export function tokenisePlayground(input: string, max = 30): string[] {
  return input
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z']/g, "").toLowerCase())
    .filter((w) => w.length > 0)
    .slice(0, max);
}
