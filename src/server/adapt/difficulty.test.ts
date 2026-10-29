import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { MIN_DIFFICULTY_TRANSITIONS, passageDifficulty } from "./difficulty";
import type { ModelMap } from "./scoring";
import { COLD_BIGRAM_THRESHOLD } from "./select";
import type { ModelState } from "./welford";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const L = DEFAULT_HAND_LAYOUT;

/** Every lower-case letter pair, mean from `meanOf`, one sample each
 *  (676 samples: warm). */
function model(meanOf: (pair: string) => number, n = 1): Map<string, ModelState> {
  const m = new Map<string, ModelState>();
  for (const a of LETTERS) for (const b of LETTERS) m.set(a + b, { mean: meanOf(a + b), variance: 0, n });
  return m;
}

/** 25 everyday words: 89 in-word transitions. */
const PASSAGE = [
  "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dogs", "while", "seven",
  "people", "watch", "from", "their", "small", "house", "near", "river", "every", "morning",
  "before", "work", "starts", "again", "today",
];

describe("passageDifficulty", () => {
  it("is 1 when every pair sits at its category baseline and the categories are equal", () => {
    expect(passageDifficulty(PASSAGE, model(() => 100), L)).toBe(1);
  });

  it("is above 1 for a passage full of the user's weak pairs, below 1 for one without them", () => {
    const weak = new Set(["th", "he", "er", "re"]);
    const m = model((p) => (weak.has(p) ? 300 : 100));
    const hard = passageDifficulty(["there", "where", "other", "rather", "father", "mother", "either", "brother"], m, L);
    const easy = passageDifficulty(["quick", "jumps", "fox", "lazy", "dogs", "back", "milk", "pond", "wind", "gold"], m, L);
    expect(hard).not.toBeNull();
    expect(easy).not.toBeNull();
    expect(hard!).toBeGreaterThan(1);
    expect(easy!).toBeLessThan(1);
  });

  it("is unchanged when every mean is scaled by 0.8 (skill-invariant)", () => {
    // A varied model: means from 70 to 250 ms depending on the pair.
    const varied = (p: string) => 70 + ((p.charCodeAt(0) * 31 + p.charCodeAt(1) * 17) % 181);
    const before = passageDifficulty(PASSAGE, model(varied), L);
    const after = passageDifficulty(PASSAGE, model((p) => 0.8 * varied(p)), L);
    expect(before).not.toBeNull();
    expect(before).not.toBe(1);
    expect(after).toBe(before);
  });

  it("rounds to 3 decimal places", () => {
    const varied = (p: string) => 90 + ((p.charCodeAt(0) * 7 + p.charCodeAt(1) * 13) % 97);
    const d = passageDifficulty(PASSAGE, model(varied), L)!;
    expect(Math.round(d * 1000) / 1000).toBe(d);
  });

  it("is null while the model is cold", () => {
    // Fewer total samples than the cold threshold.
    const cold = new Map<string, ModelState>([["th", { mean: 100, variance: 0, n: COLD_BIGRAM_THRESHOLD - 1 }]]);
    expect(passageDifficulty(PASSAGE, cold, L)).toBeNull();
    expect(passageDifficulty(PASSAGE, new Map(), L)).toBeNull();
    const warm = new Map<string, ModelState>([["th", { mean: 100, variance: 0, n: COLD_BIGRAM_THRESHOLD }]]);
    expect(passageDifficulty(PASSAGE, warm, L)).not.toBeNull();
  });

  it("is null under 20 in-word transitions; one-letter words add none", () => {
    const m = model(() => 100);
    // 6 words of 4 letters = 18 transitions, plus one-letter words (none).
    const short = ["word", "play", "time", "fast", "slow", "kind", "a", "i"];
    expect(passageDifficulty(short, m, L)).toBeNull();
    // 18 + 2 = 20 transitions exactly.
    const enough = ["word", "play", "time", "fast", "slow", "kind", "got", "a"];
    expect(MIN_DIFFICULTY_TRANSITIONS).toBe(20);
    expect(passageDifficulty(enough, m, L)).toBe(1);
    expect(passageDifficulty([], m, L)).toBeNull();
  });

  it("reads pairs case-insensitively, like the bigram model", () => {
    const weak = new Set(["th", "he"]);
    const m: ModelMap = model((p) => (weak.has(p) ? 240 : 100));
    const lower = passageDifficulty(PASSAGE, m, L);
    const upper = passageDifficulty(PASSAGE.map((w) => w[0]!.toUpperCase() + w.slice(1)), m, L);
    expect(upper).toBe(lower);
  });
});
