import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT, type HandLayoutPrefs } from "@/lib/hand-layout";
import { bigramCategory } from "@/lib/keystrokes/motor-features";
import {
  type ModelMap,
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  MIN_SAMPLES_FOR_WEAKNESS,
  weakness,
} from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import type { ModelState } from "@/server/adapt/welford";
import { weakestPatterns } from "./weakest-patterns";

const st = (mean: number, n = 20, variance = 400): ModelState => ({ mean, n, variance });
const EMPTY: ModelMap = new Map();

/** The history loader's pair and trigram loops before they moved here,
 *  kept as the reference the moved code must match. */
function oldLoaderOrder(bigrams: ModelMap, trigrams: ModelMap, layout: HandLayoutPrefs) {
  const baselines = bigramBaselines(bigrams, layout);
  const pairs: { key: string; weakness: number }[] = [];
  for (const [key, s] of bigrams) {
    if (s.n < MIN_SAMPLES_FOR_WEAKNESS || key.length !== 2) continue;
    const w = weakness(s, baselineForCategory(bigramCategory(key[0]!, key[1]!, layout), baselines));
    if (w > 0) pairs.push({ key, weakness: w });
  }
  pairs.sort((a, b) => b.weakness - a.weakness);
  const tb = baselineMean(trigrams);
  const tris: { key: string; weakness: number }[] = [];
  for (const [key, s] of trigrams) {
    if (s.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    const w = weakness(s, tb);
    if (w > 0) tris.push({ key, weakness: w });
  }
  tris.sort((a, b) => b.weakness - a.weakness);
  return { pairs: pairs.slice(0, 12), trigrams: tris.slice(0, 12) };
}

/** A fixture with every branch: same-finger, same-hand and cross-hand
 *  pairs, a low-sample pair, a non-pair key and pairs faster than their
 *  category baseline. */
function fixture() {
  const bigrams = new Map<string, ModelState>();
  const letters = "abcdefghijklmnop";
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < 3; j++) {
      const key = letters[i]! + letters[(i * 7 + j * 3 + 1) % letters.length]!;
      bigrams.set(key, st(80 + ((i * 37 + j * 53) % 140), 5 + ((i + j) % 30)));
    }
  }
  bigrams.set("ed", st(400, 2)); // too few samples
  bigrams.set("abc", st(900)); // not a pair
  const trigrams = new Map<string, ModelState>();
  for (let i = 0; i < 20; i++) {
    trigrams.set(`t${letters[i % 16]}${letters[(i * 3) % 16]}`, st(150 + ((i * 41) % 200), 4 + (i % 9)));
  }
  return { bigrams, trigrams };
}

describe("weakestPatterns: pairs and trigrams", () => {
  it("match the old history loader's order on a fixture", () => {
    const { bigrams, trigrams } = fixture();
    const got = weakestPatterns({ bigrams, trigrams, words: EMPTY }, DEFAULT_HAND_LAYOUT);
    const want = oldLoaderOrder(bigrams, trigrams, DEFAULT_HAND_LAYOUT);
    expect(got.pairs.map((p) => [p.key, p.weakness])).toEqual(want.pairs.map((p) => [p.key, p.weakness]));
    expect(got.trigrams.map((p) => [p.key, p.weakness])).toEqual(
      want.trigrams.map((p) => [p.key, p.weakness]),
    );
    expect(got.pairs.length).toBe(12);
  });

  it("respects the finger map", () => {
    const { bigrams, trigrams } = fixture();
    const layout = {
      fingers: { ...DEFAULT_HAND_LAYOUT.fingers, L5: { enabled: false, homeKey: "KeyA" } },
    };
    const got = weakestPatterns({ bigrams, trigrams, words: EMPTY }, layout);
    expect(got.pairs.map((p) => p.key)).toEqual(
      oldLoaderOrder(bigrams, trigrams, layout).pairs.map((p) => p.key),
    );
  });

  it("carries the mean and sample count, and honours the limits", () => {
    const bigrams = new Map([["th", st(400, 25)], ["he", st(100, 25)], ["an", st(100, 25)]]);
    const got = weakestPatterns({ bigrams, trigrams: EMPTY, words: EMPTY }, DEFAULT_HAND_LAYOUT, {
      pairs: 1,
      trigrams: 1,
      words: 1,
    });
    expect(got.pairs).toHaveLength(1);
    expect(got.pairs[0]).toMatchObject({ key: "th", meanMs: 400, sampleCount: 25 });
  });

  it("reports cold, and the baselines", () => {
    const bigrams = new Map([["th", st(200, COLD_BIGRAM_THRESHOLD - 1)]]);
    const trigrams = new Map([["the", st(300, 10)]]);
    const words = new Map([["their", st(500, 10)]]);
    const cold = weakestPatterns({ bigrams, trigrams, words }, DEFAULT_HAND_LAYOUT);
    expect(cold.cold).toBe(true);
    expect(cold.bigramBaselineMs).toBe(200);
    expect(cold.trigramBaselineMs).toBe(300);
    expect(cold.wordBaselineMs).toBe(500);
    bigrams.set("he", st(100, 1));
    expect(weakestPatterns({ bigrams, trigrams, words }, DEFAULT_HAND_LAYOUT).cold).toBe(false);
  });

  it("is empty and cold for a fresh user", () => {
    const got = weakestPatterns({ bigrams: EMPTY, trigrams: EMPTY, words: EMPTY }, DEFAULT_HAND_LAYOUT);
    expect(got).toEqual({
      pairs: [],
      trigrams: [],
      words: [],
      cold: true,
      bigramBaselineMs: 0,
      trigramBaselineMs: 0,
      wordBaselineMs: 0,
    });
  });
});
