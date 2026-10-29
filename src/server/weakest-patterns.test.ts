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
import {
  MIN_FIT_STATES,
  expectedWordMs,
  fitWordLengthModel,
  weakestPatterns,
} from "./weakest-patterns";

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

/** A distinct key of `len` letters; `variant` shifts the letters. */
const wordOf = (len: number, variant: number) =>
  Array.from({ length: len }, (_, i) => String.fromCharCode(97 + ((variant * 5 + i) % 26))).join("");

/** Two words per length 3..9, typed exactly at a + c·(len − 1). */
function onLine(a: number, c: number): Map<string, ModelState> {
  const out = new Map<string, ModelState>();
  for (let len = 3; len <= 9; len++) {
    for (const v of [1, 2]) out.set(wordOf(len, v + len * 2), st(a + c * (len - 1), 30));
  }
  return out;
}

const rankWords = (words: ModelMap) =>
  weakestPatterns({ bigrams: EMPTY, trigrams: EMPTY, words }, DEFAULT_HAND_LAYOUT).words.map((w) => w.key);

describe("weakestPatterns: words, length-neutral", () => {
  it("no longer ranks a long word typed at the usual rate as weakest", () => {
    const words = onLine(150, 110);
    // 13 letters at exactly the fitted rate: slow in total, normal for its length.
    words.set("international", st(150 + 110 * 12, 30));
    // The old ranking, against the mean word time, put it first.
    const base = baselineMean(words);
    const old = [...words].sort((x, y) => weakness(y[1], base) - weakness(x[1], base));
    expect(old[0]![0]).toBe("international");
    expect(rankWords(words)).not.toContain("international");
  });

  it("ranks a short word with one slow transition above it", () => {
    const words = onLine(150, 110);
    words.set("international", st(150 + 110 * 12, 30));
    words.set("the", st(150 + 110 * 2 + 150, 30));
    const ranked = rankWords(words);
    expect(ranked[0]).toBe("the");
    const longAt = ranked.indexOf("international");
    expect(longAt === -1 || longAt > 0).toBe(true);
  });

  it("ranks 3- and 9-letter words equally when both sit the same amount above a slow-start fit", () => {
    const words = onLine(300, 100);
    words.set("cat", st(300 + 100 * 2 + 80, 30));
    words.set("elephants", st(300 + 100 * 8 + 80, 30));
    const model = fitWordLengthModel(words);
    expect(model.fitted).toBe(true);
    expect(model.a).toBeGreaterThan(0);
    const got = weakestPatterns({ bigrams: EMPTY, trigrams: EMPTY, words }, DEFAULT_HAND_LAYOUT).words;
    const cat = got.find((w) => w.key === "cat")!;
    const elephants = got.find((w) => w.key === "elephants")!;
    expect(cat.weakness).toBeGreaterThan(0);
    expect(cat.weakness).toBeCloseTo(elephants.weakness, 6);
    // A per-transition baseline with no intercept would favour the short word.
    const perTransition = (300 + 100 * 5) / 5;
    expect(weakness(words.get("cat")!, perTransition * 2)).toBeGreaterThan(
      weakness(words.get("elephants")!, perTransition * 8) + 50,
    );
  });

  it("falls back to time per transition below the fit's state count", () => {
    const words = new Map<string, ModelState>();
    for (let i = 0; i < MIN_FIT_STATES - 2; i++) words.set(wordOf(3 + (i % 5), i), st(100 * (2 + (i % 5)) + i, 10));
    words.set(wordOf(4, 30), st(900, 10));
    expect(words.size).toBe(MIN_FIT_STATES - 1);
    const model = fitWordLengthModel(words);
    expect(model.fitted).toBe(false);
    expect(model.a).toBe(0);
    let num = 0;
    let den = 0;
    for (const [k, s] of words) {
      num += Math.min(s.n, 39) * (s.mean / (k.length - 1));
      den += Math.min(s.n, 39);
    }
    expect(model.c).toBeCloseTo(num / den, 9);
    const top = weakestPatterns({ bigrams: EMPTY, trigrams: EMPTY, words }, DEFAULT_HAND_LAYOUT).words[0]!;
    expect(top.key).toBe(wordOf(4, 30));
    expect(top.weakness).toBeCloseTo(weakness(words.get(top.key)!, expectedWordMs(model, 4)), 9);
  });

  it("falls back when the fit gives a negative intercept, a flat slope or one length", () => {
    const negative = new Map<string, ModelState>();
    for (let x = 2; x <= 12; x++) negative.set(wordOf(x + 1, x), st(-200 + 150 * x, 30));
    expect(fitWordLengthModel(negative)).toMatchObject({ a: 0, fitted: false });
    const falling = new Map<string, ModelState>();
    for (let x = 2; x <= 12; x++) falling.set(wordOf(x + 1, x), st(2_000 - 50 * x, 30));
    expect(fitWordLengthModel(falling)).toMatchObject({ a: 0, fitted: false });
    const oneLength = new Map<string, ModelState>();
    for (let v = 0; v < 12; v++) oneLength.set(wordOf(5, v), st(500 + v, 30));
    expect(fitWordLengthModel(oneLength)).toMatchObject({ a: 0, c: expect.any(Number), fitted: false });
  });

  it("ignores low-sample words, never ranks words under 3 letters, and keeps the mean baseline", () => {
    const words = onLine(150, 110);
    words.set("zz", st(5_000, 30));
    words.set("quiz", st(9_000, MIN_SAMPLES_FOR_WEAKNESS - 1));
    const out = weakestPatterns({ bigrams: EMPTY, trigrams: EMPTY, words }, DEFAULT_HAND_LAYOUT);
    expect(out.words.map((w) => w.key)).not.toContain("zz");
    expect(out.words.map((w) => w.key)).not.toContain("quiz");
    expect(out.wordBaselineMs).toBe(baselineMean(words));
  });
});
