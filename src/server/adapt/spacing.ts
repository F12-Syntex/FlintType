import type { HandLayoutPrefs } from "@/lib/hand-layout";
import { deriveFeatureKeys } from "./motor-features";

/** Pattern-level spacing — spaced repetition for weak motions.
 *
 *  Word-level recency stops the same *word* from repeating, but the
 *  selector could still drill the same weak *pattern* (say "br") test
 *  after test through a rotating cast of carrier words, crowding out
 *  every other weakness. Distributed, interleaved practice retains
 *  better than massed practice, so a pattern that recent tests drilled
 *  heavily is backed off for a test or two and then returns — unless
 *  its timing improved in the meantime, in which case its weakness has
 *  dropped and it fades out on its own.
 *
 *  No extra storage: the "dose" is read from the persisted recency map
 *  (word → tests ago), which already records exactly which words — and
 *  therefore which pairs and finger motions — each recent test served.
 *  The dose feeds the coverage pick (`sampling.ts`) as a starting
 *  overlap, so spacing and in-passage coverage share one mechanism. */

/** Each test of age decays a word's contribution to its patterns'
 *  dose by this factor: last test counts 1, the one before 0.5, … */
export const SPACING_DECAY = 0.5;

/** Dose (in decayed carrier words) that counts as a full drilling. */
export const SPACING_FULL_DOSE = 4;

/** Starting overlap of a fully-dosed pattern — 1 means "as if one
 *  carrier were already in this passage" (×COVERAGE_DECAY = ×0.4). */
export const SPACING_MAX_OVERLAP = 1;

/** Coverage keys for every bigram and motor feature in a word: `b:xy`
 *  and `f:<feature>`. Same namespace as the selector's weak-pattern
 *  keys, so a dose lines up with the candidates it should damp. */
export function patternKeysOf(word: string, layout: HandLayoutPrefs): string[] {
  const w = word.toLowerCase();
  const keys = new Set<string>();
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]!;
    const b = w[i]!;
    keys.add(`b:${a}${b}`);
    for (const fk of deriveFeatureKeys(a, b, layout)) keys.add(`f:${fk}`);
  }
  return [...keys];
}

/** Decayed carrier count per pattern key across recently-shown words. */
export function patternDose(
  recentlyShown: ReadonlyMap<string, number>,
  layout: HandLayoutPrefs,
): Map<string, number> {
  const dose = new Map<string, number>();
  for (const [word, testsAgo] of recentlyShown) {
    if (!(testsAgo >= 0)) continue;
    const weight = SPACING_DECAY ** testsAgo;
    for (const key of patternKeysOf(word, layout)) {
      dose.set(key, (dose.get(key) ?? 0) + weight);
    }
  }
  return dose;
}

/** Starting coverage overlap (0 … SPACING_MAX_OVERLAP) for a dose. */
export function spacingOverlap(dose: number): number {
  if (!(dose > 0)) return 0;
  return SPACING_MAX_OVERLAP * Math.min(1, dose / SPACING_FULL_DOSE);
}

/** Starting-overlap map restricted to the patterns some candidate
 *  actually carries (keeps the map small for big pools). */
export function initialOverlaps(
  dose: ReadonlyMap<string, number>,
  candidatePatterns: Iterable<readonly string[]>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const patterns of candidatePatterns) {
    for (const p of patterns) {
      if (out.has(p)) continue;
      const o = spacingOverlap(dose.get(p) ?? 0);
      if (o > 0) out.set(p, o);
    }
  }
  return out;
}
