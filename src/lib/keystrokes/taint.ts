import type { KeystrokeTiming } from "@/types/adapt";

/** Inter-keystroke intervals below this are physiologically
 *  impossible — they indicate paste artifacts, hardware autorepeat,
 *  or the OS buffering keys. Drop them. */
export const MIN_INTERVAL_MS = 25;

/** A keystroke is tainted if it itself was wrong, or if it's the
 *  first correctly-typed keystroke in a word after one or more
 *  errors — that's the recovery key, and its latency reflects the
 *  user's pause to figure out what to do, not their typing speed. */
export function computeTaintMask(timings: readonly KeystrokeTiming[]): boolean[] {
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
