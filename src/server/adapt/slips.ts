import type { HandLayoutPrefs } from "@/lib/hand-layout";
import type { KeystrokeTiming } from "@/types/adapt";
import { deriveFeatureKeys } from "./motor-features";

/** Slips — accuracy-aware measurement.
 *
 *  Clean timings alone are blind to accuracy: a pair you mistype one
 *  time in five but type quickly when you get it right looked like a
 *  strength, so practice never targeted it. A slip is a fumbled
 *  transition: the previous key in the word was right, then the next
 *  one was wrong. Each slip becomes one sample for that bigram (and
 *  its motor features and trigram) whose value is what the mistake
 *  *cost*: the time from the previous correct key until the intended
 *  key was finally typed correctly — the wrong press, noticing,
 *  backspacing and retyping.
 *
 *  Folding those costs into the same running mean turns it into the
 *  pair's *effective* time: expected milliseconds per attempt
 *  including corrections. A pair's weakness therefore rises with both
 *  slowness and error rate, weighted by real time lost, with no extra
 *  storage and the same confidence / recency handling as timings.
 *  Only the first wrong key after a correct one counts, so a cascade
 *  of follow-on errors is a single slip. */

/** Cost bounds relative to the user's typical bigram time (`refMs`):
 *  a slip always costs at least two key-times (wrong press + right
 *  press); past MAX the user stopped to think and the excess isn't
 *  typing signal. An uncorrected slip (the intended key never arrives
 *  in that word) is charged DEFAULT. */
export const SLIP_COST_MIN_RATIO = 2;
export const SLIP_COST_MAX_RATIO = 8;
export const SLIP_COST_DEFAULT_RATIO = 4;

/** Reference bigram time before the user has a baseline (~65 wpm). */
export const SLIP_COLD_REF_MS = 180;

/** How many following keystrokes to scan for the correction. Bounds
 *  the walk and keeps a much-later identical letter from posing as
 *  the fix. */
export const SLIP_SEARCH_WINDOW = 32;

export type SlipSamples = {
  bigrams: Map<string, number[]>;
  trigrams: Map<string, number[]>;
  motorFeatures: Map<string, number[]>;
  count: number;
};

/** Walk the keystroke stream and emit one cost sample per slip.
 *  `tainted[i]` marks keystrokes whose own latency is contaminated by
 *  an earlier error (see `measure.ts`); it gates the trigram sample,
 *  whose first interval must be a clean one. */
export function extractSlips(
  timings: readonly KeystrokeTiming[],
  layout: HandLayoutPrefs,
  refMs: number,
  tainted: readonly boolean[],
): SlipSamples {
  const out: SlipSamples = {
    bigrams: new Map(),
    trigrams: new Map(),
    motorFeatures: new Map(),
    count: 0,
  };
  const ref = refMs > 0 ? refMs : SLIP_COLD_REF_MS;
  const minCost = SLIP_COST_MIN_RATIO * ref;
  const maxCost = SLIP_COST_MAX_RATIO * ref;

  for (let i = 1; i < timings.length; i++) {
    const b = timings[i]!;
    if (b.correct || b.expected.length === 0) continue;
    const a = timings[i - 1]!;
    if (!a.correct || a.expected.length === 0) continue;
    if (a.wordIndex !== b.wordIndex) continue;

    const target = b.expected.toLowerCase();
    const prev = a.expected.toLowerCase();
    const cost = slipCost(timings, i, a.t, target, minCost, maxCost, ref);

    push(out.bigrams, prev + target, cost);
    for (const fk of deriveFeatureKeys(prev, target, layout)) {
      push(out.motorFeatures, fk, cost);
    }
    out.count++;

    if (i >= 2) {
      const z = timings[i - 2]!;
      const lead = a.t - z.t;
      if (
        z.correct &&
        z.expected.length > 0 &&
        z.wordIndex === b.wordIndex &&
        !tainted[i - 1] &&
        lead > 0 &&
        lead <= maxCost
      ) {
        push(out.trigrams, z.expected.toLowerCase() + prev + target, lead + cost);
      }
    }
  }
  return out;
}

/** Time from the last correct key (`fromT`) until `target` was typed
 *  correctly in the same word, clamped to [min, max]; DEFAULT × ref
 *  when the slip was never corrected within the search window. */
function slipCost(
  timings: readonly KeystrokeTiming[],
  slipIndex: number,
  fromT: number,
  target: string,
  min: number,
  max: number,
  ref: number,
): number {
  const word = timings[slipIndex]!.wordIndex;
  const end = Math.min(timings.length, slipIndex + 1 + SLIP_SEARCH_WINDOW);
  for (let j = slipIndex + 1; j < end; j++) {
    const c = timings[j]!;
    if (c.wordIndex !== word || !c.correct) continue;
    if (c.expected.toLowerCase() !== target) continue;
    return Math.min(max, Math.max(min, c.t - fromT));
  }
  return SLIP_COST_DEFAULT_RATIO * ref;
}

function push(bucket: Map<string, number[]>, key: string, v: number): void {
  const arr = bucket.get(key);
  if (arr) arr.push(v);
  else bucket.set(key, [v]);
}
