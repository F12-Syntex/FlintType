import type { HandLayoutPrefs } from "@/lib/hand-layout";
import { bigramCategory } from "@/lib/keystrokes/motor-features";
import {
  type BigramBaselines,
  type ModelMap,
  baselineForCategory,
} from "./scoring";

/** Per-word predicted typing time, used by the challenge-band
 *  sampler. Sums bigram means within the word (effective times, so a
 *  word full of pairs you fumble predicts slower too). Cold bigrams fall
 *  back to the *category* baseline so an unsampled doubled letter
 *  is predicted to take roughly as long as the user's other doubled
 *  letters, rather than the global average (which would make
 *  doubled-heavy words look easier than they really are). */
export function predictedWordMs(
  word: string,
  bigramModels: ModelMap,
  baselines: BigramBaselines,
  layout: HandLayoutPrefs,
): number {
  if (word.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < word.length; i++) {
    const a = word[i - 1]!.toLowerCase();
    const b = word[i]!.toLowerCase();
    const st = bigramModels.get(a + b);
    total += st
      ? st.mean
      : baselineForCategory(bigramCategory(a, b, layout), baselines);
  }
  return total;
}
