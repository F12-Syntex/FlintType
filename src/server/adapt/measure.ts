import type { HandLayoutPrefs } from "@/lib/hand-layout";
import type { KeystrokeTiming } from "@/types/adapt";
import { deriveFeatureKeys } from "./motor-features";

/** Inter-keystroke intervals below this are physiologically
 *  impossible — they indicate paste artifacts, hardware autorepeat,
 *  or the OS buffering keys. Drop them. */
export const MIN_INTERVAL_MS = 25;

/** Reject samples > MAX_INTERVAL_RATIO × the existing baseline. The
 *  user paused (looked at the screen, sneezed, took a phone call) —
 *  the timing isn't a signal about typing speed. When no baseline
 *  exists yet, fall back to ABSOLUTE_PAUSE_MS so first-test data
 *  isn't dominated by a single 5-second pause. */
export const MAX_INTERVAL_RATIO = 4;
export const ABSOLUTE_PAUSE_MS = 1500;

/** Result of the measurement phase — three parallel buckets of raw
 *  samples ready for the Welford updater. */
export type Measurements = {
  bigrams: Map<string, number[]>;
  trigrams: Map<string, number[]>;
  motorFeatures: Map<string, number[]>;
  accepted: number;
  rejected: number;
};

export type Baselines = {
  /** Map from bigram to existing mean_ms (or undefined if none). */
  bigram: ReadonlyMap<string, number>;
  trigram: ReadonlyMap<string, number>;
};

/** Walk the keystroke stream and emit bigram, trigram, and motor-
 *  feature samples. Only correctly-typed pairs/triples within a
 *  single word contribute — anything involving an error keystroke,
 *  a backspace, or a word boundary is dropped. */
export function extract(
  timings: readonly KeystrokeTiming[],
  layout: HandLayoutPrefs,
  baselines: Baselines,
): Measurements {
  const bigrams = new Map<string, number[]>();
  const trigrams = new Map<string, number[]>();
  const motorFeatures = new Map<string, number[]>();
  let accepted = 0;
  let rejected = 0;

  // Mark indices that are "tainted": the keystroke itself was wrong,
  // or it's the first correct keystroke in a word after an error
  // (the user has just paused to recover — their timing says nothing
  // about their typing speed).
  const tainted = computeTaintMask(timings);

  for (let i = 1; i < timings.length; i++) {
    const a = timings[i - 1]!;
    const b = timings[i]!;
    if (a.wordIndex !== b.wordIndex) continue;
    if (tainted[i] || tainted[i - 1]) continue;
    if (!a.correct || !b.correct) continue;
    const dt = b.t - a.t;
    if (dt < MIN_INTERVAL_MS) {
      rejected++;
      continue;
    }
    const charA = a.expected;
    const charB = b.expected;
    if (charA.length === 0 || charB.length === 0) continue;
    const bigram = (charA + charB).toLowerCase();
    const baseline = baselines.bigram.get(bigram) ?? ABSOLUTE_PAUSE_MS;
    if (dt > baseline * MAX_INTERVAL_RATIO) {
      rejected++;
      continue;
    }

    pushSample(bigrams, bigram, dt);
    accepted++;

    for (const feat of deriveFeatureKeys(charA, charB, layout)) {
      pushSample(motorFeatures, feat, dt);
    }

    if (i >= 2) {
      const z = timings[i - 2]!;
      if (
        z.wordIndex === b.wordIndex &&
        z.correct &&
        !tainted[i - 2] &&
        z.expected.length > 0
      ) {
        const trigram = (z.expected + charA + charB).toLowerCase();
        const tBase = baselines.trigram.get(trigram) ?? ABSOLUTE_PAUSE_MS * 2;
        const tdt = b.t - z.t;
        if (tdt >= MIN_INTERVAL_MS * 2 && tdt <= tBase * MAX_INTERVAL_RATIO) {
          pushSample(trigrams, trigram, tdt);
        }
      }
    }
  }

  return { bigrams, trigrams, motorFeatures, accepted, rejected };
}

/** A keystroke is tainted if it itself was wrong, or if it's the
 *  first correctly-typed keystroke in a word after one or more
 *  errors — that's the recovery key, and its latency reflects the
 *  user's pause to figure out what to do, not their typing speed. */
function computeTaintMask(timings: readonly KeystrokeTiming[]): boolean[] {
  const out = new Array<boolean>(timings.length).fill(false);
  let lastWord = -1;
  let recovering = false;
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i]!;
    if (t.wordIndex !== lastWord) {
      lastWord = t.wordIndex;
      recovering = false;
    }
    if (!t.correct) {
      out[i] = true;
      recovering = true;
      continue;
    }
    if (recovering) {
      out[i] = true;
      recovering = false;
    }
  }
  return out;
}

function pushSample(
  bucket: Map<string, number[]>,
  key: string,
  sample: number,
): void {
  const arr = bucket.get(key);
  if (arr) arr.push(sample);
  else bucket.set(key, [sample]);
}
