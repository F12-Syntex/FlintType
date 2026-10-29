import type { HandLayoutPrefs } from "@/lib/hand-layout";
import { predictedWordMs } from "./prediction";
import { bigramBaselines, type ModelMap } from "./scoring";
import { COLD_BIGRAM_THRESHOLD } from "./select";

/** Fewest in-word transitions for a difficulty figure: below this one
 *  slow pair swings the ratio too far to mean anything. */
export const MIN_DIFFICULTY_TRANSITIONS = 20;

/** How hard this passage was for this user (spec-10 §11): the predicted
 *  time of its in-word letter pairs over what the same number of pairs
 *  takes at the user's own average pair time. 1 is an average passage
 *  for them; above 1 it was full of their slower pairs.
 *
 *  `words` are the reached words (`input.words`); each word of 2 or more
 *  letters contributes its lower-cased adjacent pairs (predictedWordMs).
 *  Call it with the PRE-update model that submit loaded: `deltasFor`
 *  never mutates it (apply.test.ts).
 *
 *  Stored means are effective times (they include mistake costs), so they
 *  are used only as a ratio against the same snapshot: a uniform
 *  improvement shrinks the numerator and the denominator alike, which
 *  keeps the figure skill-invariant. Null when the model is cold or the
 *  passage has fewer than 20 in-word transitions. Rounded to 3 dp. */
export function passageDifficulty(
  words: readonly string[],
  bigramStates: ModelMap,
  layout: HandLayoutPrefs,
): number | null {
  let samples = 0;
  for (const st of bigramStates.values()) samples += st.n;
  if (samples < COLD_BIGRAM_THRESHOLD) return null;

  let transitions = 0;
  for (const w of words) if (w.length >= 2) transitions += w.length - 1;
  if (transitions < MIN_DIFFICULTY_TRANSITIONS) return null;

  const baselines = bigramBaselines(bigramStates, layout);
  if (!(baselines.overall > 0)) return null;

  let predMs = 0;
  for (const w of words) predMs += predictedWordMs(w, bigramStates, baselines, layout);
  const dRel = predMs / (transitions * baselines.overall);
  return Number.isFinite(dRel) ? Math.round(dRel * 1000) / 1000 : null;
}
