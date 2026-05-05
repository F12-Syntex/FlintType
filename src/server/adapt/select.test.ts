import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import {
  COLD_BIGRAM_THRESHOLD,
  advanceRecency,
  selectWords,
} from "./select";
import type { ModelState } from "./welford";

const SEED_RNG = () => {
  let s = 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
};

const POOL = ["the", "and", "for", "you", "but", "are", "with", "this"];

const EMPTY = {
  bigramModels: new Map<string, ModelState>(),
  trigramModels: new Map<string, ModelState>(),
  motorFeatureModels: new Map<string, ModelState>(),
  layout: DEFAULT_HAND_LAYOUT,
  recentTests: [],
  recentlyShown: new Map<string, number>(),
};

describe("selectWords", () => {
  it("returns N words from the pool on cold start", () => {
    const r = selectWords({
      count: 5,
      pool: POOL,
      ...EMPTY,
      rng: SEED_RNG(),
    });
    expect(r.words.length).toBe(5);
    expect(r.cold).toBe(true);
    for (const w of r.words) expect(POOL).toContain(w);
  });

  it("never returns more than the pool size", () => {
    const r = selectWords({ count: 100, pool: POOL, ...EMPTY, rng: SEED_RNG() });
    expect(r.words.length).toBe(POOL.length);
  });

  it("never duplicates within a single selection", () => {
    const r = selectWords({ count: 5, pool: POOL, ...EMPTY, rng: SEED_RNG() });
    expect(new Set(r.words).size).toBe(r.words.length);
  });

  it("stops being cold once enough bigram samples accumulate", () => {
    const bigramModels = new Map<string, ModelState>();
    for (let i = 0; i < 5; i++) {
      bigramModels.set(`b${i}`, {
        mean: 120,
        variance: 0,
        n: COLD_BIGRAM_THRESHOLD,
      });
    }
    const r = selectWords({
      count: 5,
      pool: POOL,
      ...EMPTY,
      bigramModels,
      rng: SEED_RNG(),
    });
    expect(r.cold).toBe(false);
  });

  it("biases toward words with weak bigrams when warm", () => {
    // Make 'th' very slow (weak); 'an' fast. 'the' contains 'th'; 'and' contains 'an'.
    const bigramModels = new Map<string, ModelState>([
      ["th", { mean: 400, variance: 0, n: 50 }],
      ["he", { mean: 100, variance: 0, n: 50 }],
      ["an", { mean: 100, variance: 0, n: 50 }],
      ["nd", { mean: 100, variance: 0, n: 50 }],
    ]);
    // Pad with enough samples to leave cold.
    for (let i = 0; i < 5; i++) {
      bigramModels.set(`fill_${i}`, { mean: 100, variance: 0, n: 50 });
    }
    const counts = new Map<string, number>([["the", 0], ["and", 0]]);
    const rng = SEED_RNG();
    for (let trial = 0; trial < 200; trial++) {
      const r = selectWords({
        count: 1,
        pool: ["the", "and"],
        ...EMPTY,
        bigramModels,
        // Simulate warm state by passing a custom recentlyShown that
        // keeps both words eligible.
        rng,
      });
      const w = r.words[0]!;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    // 'the' should win clearly when 'th' is the slow bigram.
    expect(counts.get("the")!).toBeGreaterThan(counts.get("and")!);
  });

  it("never returns 0 words when count > 0 and pool is non-empty", () => {
    const r = selectWords({
      count: 3,
      pool: ["abc"],
      ...EMPTY,
      rng: SEED_RNG(),
    });
    expect(r.words.length).toBeGreaterThan(0);
  });
});

describe("advanceRecency", () => {
  it("ages prior entries by 1 and stamps new words at 0", () => {
    const prev = new Map([["the", 0], ["and", 1]]);
    const next = advanceRecency(prev, ["for"], 5);
    expect(next.get("the")).toBe(1);
    expect(next.get("and")).toBe(2);
    expect(next.get("for")).toBe(0);
  });

  it("drops entries past the recovery window", () => {
    const prev = new Map([["old", 4]]);
    const next = advanceRecency(prev, [], 5);
    // 4 + 1 = 5 → at-or-past the window → dropped.
    expect(next.has("old")).toBe(false);
  });

  it("a word both aged-out and freshly shown lands at distance 0", () => {
    const prev = new Map([["x", 4]]);
    const next = advanceRecency(prev, ["x"], 5);
    expect(next.get("x")).toBe(0);
  });
});
