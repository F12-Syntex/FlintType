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

/** Minimum word length before we trust a per-word timing. Two-letter
 *  words are dominated by their single bigram and add no fresh signal
 *  beyond what the bigram model already captures; the word model
 *  starts to earn its keep at three or more characters. */
export const MIN_WORD_LENGTH_FOR_SAMPLE = 3;

/** Result of the measurement phase — four parallel buckets of raw
 *  samples ready for the Welford updater. The new `words` bucket holds
 *  whole-word total durations (last keystroke time minus first), keyed
 *  by the lowercase target word. */
export type Measurements = {
  bigrams: Map<string, number[]>;
  trigrams: Map<string, number[]>;
  motorFeatures: Map<string, number[]>;
  words: Map<string, number[]>;
  accepted: number;
  rejected: number;
};

export type Baselines = {
  /** Map from bigram to existing mean_ms (or undefined if none). */
  bigram: ReadonlyMap<string, number>;
  trigram: ReadonlyMap<string, number>;
  /** Map from word to existing mean_ms (or undefined). Cold words
   *  fall back to the per-char `ABSOLUTE_PAUSE_MS * length` cap so a
   *  first sample isn't dropped for "exceeding" a baseline that
   *  doesn't exist yet. */
  word: ReadonlyMap<string, number>;
};

/** Walk the keystroke stream and emit bigram, trigram, motor-feature,
 *  and word samples. Only correctly-typed pairs/triples within a
 *  single word contribute to the bigram / trigram / motor-feature
 *  buckets; only fully-clean words (no wrong chars, no taint, no
 *  extras past the word end) emit into the word bucket — a single
 *  bad keystroke disqualifies the whole word. */
export function extract(
  timings: readonly KeystrokeTiming[],
  layout: HandLayoutPrefs,
  baselines: Baselines,
): Measurements {
  const bigrams = new Map<string, number[]>();
  const trigrams = new Map<string, number[]>();
  const motorFeatures = new Map<string, number[]>();
  const words = new Map<string, number[]>();
  let accepted = 0;
  let rejected = 0;

  // Mark indices that are "tainted": the keystroke itself was wrong,
  // or it's the first correct keystroke in a word after an error
  // (the user has just paused to recover — their timing says nothing
  // about their typing speed).
  const tainted = computeTaintMask(timings);

  // Per-word accumulator. We finalise (or discard) a word when the
  // wordIndex changes or we hit the end of the timing stream. A word
  // is only emitted as a sample when every keystroke in it was
  // correct, untainted, and within the target length (no extras).
  let curWord = -1;
  let wordChars: string[] = [];
  let wordStartT = 0;
  let wordLastT = 0;
  let wordDirty = false;
  const flushWord = () => {
    if (wordDirty) return;
    if (wordChars.length < MIN_WORD_LENGTH_FOR_SAMPLE) return;
    const key = wordChars.join("").toLowerCase();
    const duration = wordLastT - wordStartT;
    if (duration < MIN_INTERVAL_MS * (wordChars.length - 1)) return;
    const baseline =
      baselines.word.get(key) ?? ABSOLUTE_PAUSE_MS * wordChars.length;
    if (duration > baseline * MAX_INTERVAL_RATIO) return;
    pushSample(words, key, duration);
  };

  for (let i = 0; i < timings.length; i++) {
    const t = timings[i]!;
    // Word-level accumulator runs in parallel with the pair walk.
    // Crossing into a new word flushes the previous one (and resets
    // the accumulator); inside a word we mark `wordDirty` on any
    // disqualifying keystroke and only push correct/untainted/in-
    // bounds keystrokes into wordChars.
    if (t.wordIndex !== curWord) {
      if (curWord !== -1) flushWord();
      curWord = t.wordIndex;
      wordChars = [];
      wordStartT = 0;
      wordLastT = 0;
      wordDirty = false;
    }
    if (!wordDirty) {
      if (!t.correct || tainted[i] || t.expected.length === 0) {
        wordDirty = true;
      } else {
        if (wordChars.length === 0) wordStartT = t.t;
        wordChars.push(t.expected);
        wordLastT = t.t;
      }
    }

    if (i === 0) continue;
    const a = timings[i - 1]!;
    const b = t;
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

  // Flush the trailing word — the loop above only flushes on a word
  // boundary; the last word never crosses one, so we close it here.
  if (curWord !== -1) flushWord();

  return { bigrams, trigrams, motorFeatures, words, accepted, rejected };
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
