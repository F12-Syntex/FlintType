import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import { CHALLENGE_HIGH, WEAKNESS_CONCENTRATION } from "./pacing";
import {
  COLD_BIGRAM_THRESHOLD,
  selectBatches,
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

  it("strongly concentrates on the worst word, not just leans toward it", () => {
    // 'th' is a heavy weakness; 'an' is comfortably faster. Both words
    // are warm. With the concentration exponent the weakest word should
    // dominate the single-word pick by a wide margin (>80%), not merely
    // edge out the easier one — that's the difference between "adaptive
    // feels too easy" and "adaptive serves my worst words".
    const bigramModels = new Map<string, ModelState>([
      ["th", { mean: 380, variance: 0, n: 60 }],
      ["he", { mean: 90, variance: 0, n: 60 }],
      ["an", { mean: 120, variance: 0, n: 60 }],
      ["nd", { mean: 90, variance: 0, n: 60 }],
    ]);
    for (let i = 0; i < 5; i++) {
      bigramModels.set(`fill_${i}`, { mean: 100, variance: 0, n: 60 });
    }
    const counts = new Map<string, number>([["the", 0], ["and", 0]]);
    const rng = SEED_RNG();
    const TRIALS = 300;
    for (let trial = 0; trial < TRIALS; trial++) {
      const r = selectWords({
        count: 1,
        pool: ["the", "and"],
        ...EMPTY,
        bigramModels,
        rng,
      });
      const w = r.words[0]!;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    expect(counts.get("the")! / TRIALS).toBeGreaterThan(0.8);
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

  it("spreads a multi-word selection across distinct weak motions", () => {
    // Group A carriers all carry the unsampled bigram "kx"; group B
    // all carry "vy". Every other bigram in the carriers is sampled
    // and fast, so each carrier's only weight + pattern comes from its
    // group's target bigram — and both targets weigh the same. Without
    // the coverage pass the second pick stacks the first group as often
    // as it diversifies (~0.57 both-covered); coverage damps the picked
    // group so the other motion gets covered far more often.
    const fast = (): ModelState => ({ mean: 80, variance: 0, n: 50 });
    const bigramModels = new Map<string, ModelState>([
      ["xa", fast()], ["xe", fast()], ["xo", fast()],
      ["ya", fast()], ["ye", fast()], ["yo", fast()],
    ]); // "kx" and "vy" are intentionally absent → unsampled targets.
    const pool = ["kxa", "kxe", "kxo", "vya", "vye", "vyo"];
    const rng = SEED_RNG();
    const TRIALS = 500;
    let bothCovered = 0;
    for (let t = 0; t < TRIALS; t++) {
      const r = selectWords({ count: 2, pool, ...EMPTY, bigramModels, rng });
      const hasA = r.words.some((w) => w.startsWith("kx"));
      const hasB = r.words.some((w) => w.startsWith("vy"));
      if (hasA && hasB) bothCovered++;
    }
    expect(bothCovered / TRIALS).toBeGreaterThan(0.7);
  });
});

const warm = (mean: number, n = 50): ModelState => ({ mean, variance: 0, n });

describe("selectBatches — challenge band relaxation", () => {
  it("keeps pathological words out when the strict band is short", () => {
    // Overall baseline ≈ 108ms. "qz" predicts ~3.7× (pathological, and
    // the highest-weight word); "qx" ~1.7× (in band); the rest are easy.
    // The strict band holds only "qx" — fewer than count — so it must
    // relax its easy end, not drop the ceiling and let "qz" flood in.
    const bigramModels = new Map<string, ModelState>([
      ["qz", warm(400)],
      ["qx", warm(180)],
      ["ty", warm(80)],
      ["ui", warm(80)],
      ["op", warm(80)],
      ["dd", warm(100, 200)],
      ["ff", warm(100, 200)],
      ["gg", warm(100, 200)],
      ["hh", warm(100, 200)],
      ["jj", warm(100, 200)],
    ]);
    const pool = ["qz", "qx", "ty", "ui", "op"];
    const rng = SEED_RNG();
    for (let t = 0; t < 200; t++) {
      const r = selectWords({ count: 3, pool, ...EMPTY, bigramModels, rng });
      expect(r.words.length).toBe(3);
      expect(r.words).not.toContain("qz");
      expect(r.words).toContain("qx");
    }
  });

  it("still fills the passage when nothing at all is under the ceiling", () => {
    const bigramModels = new Map<string, ModelState>([
      ["qz", warm(900)],
      ["jj", warm(100, 400)],
    ]);
    const r = selectWords({
      count: 1,
      pool: ["qz"],
      ...EMPTY,
      bigramModels,
      rng: SEED_RNG(),
    });
    expect(r.words).toEqual(["qz"]);
  });
});

describe("selectBatches — pattern spacing", () => {
  it("rotates away from a pattern the last test drilled heavily", () => {
    // Same setup as the coverage test: "kx" and "vy" are equally weak
    // (both unsampled). The last test served four "kx" carriers, so
    // this passage should lean to "vy" instead of a coin flip.
    const fast = (): ModelState => warm(80);
    const bigramModels = new Map<string, ModelState>([
      ["xa", fast()], ["xe", fast()], ["xo", fast()],
      ["ya", fast()], ["ye", fast()], ["yo", fast()],
    ]);
    const recentlyShown = new Map([
      ["kxe", 0], ["kxo", 0], ["kxi", 0], ["kxu", 0],
    ]);
    const rng = SEED_RNG();
    const TRIALS = 1000;
    let vy = 0;
    for (let t = 0; t < TRIALS; t++) {
      const r = selectWords({
        count: 1,
        pool: ["kxa", "vya"],
        ...EMPTY,
        bigramModels,
        recentlyShown,
        rng,
      });
      if (r.words[0] === "vya") vy++;
    }
    expect(vy / TRIALS).toBeGreaterThan(0.62);
  });
});

describe("selectBatches — multiple batches", () => {
  it("returns the requested number of batches", () => {
    const r = selectBatches(
      { count: 3, pool: POOL, ...EMPTY, rng: SEED_RNG() },
      4,
    );
    expect(r.batches.length).toBe(4);
    for (const b of r.batches) expect(b.length).toBe(3);
  });

  it("later batches prefer words the earlier batches didn't use", () => {
    const pool = ["bad", "cog", "fun", "hip", "jam", "kit", "mop", "rex"];
    const rng = SEED_RNG();
    const TRIALS = 300;
    let overlap = 0;
    for (let t = 0; t < TRIALS; t++) {
      const r = selectBatches({ count: 4, pool, ...EMPTY, rng }, 2);
      const first = new Set(r.batches[0]);
      overlap += r.batches[1]!.filter((w) => first.has(w)).length;
    }
    // Independent draws would share 2 of 4 on average.
    expect(overlap / TRIALS).toBeLessThan(1.2);
  });
});

describe("selectBatches — difficulty pacing", () => {
  const NOW = 1_700_000_000_000;
  const row = (wpm: number, minutesAgo: number): TestRow => ({
    id: `t${minutesAgo}`,
    userId: "u1",
    startedAt: new Date(NOW - minutesAgo * 60_000),
    completedAt: new Date(NOW - minutesAgo * 60_000 + 30_000),
    mode: "training",
    durationOrWordCount: 25,
    lengthMode: "words",
    wpm,
    accuracy: 97,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    rawWpm: null,
    peakWpm: null,
    avgWpm: null,
    stallWpm: null,
    consistency: null,
    wpmHistory: null,
  });
  // Newest first; WPM fading across the session.
  const fading = [row(80, 1), row(85, 3), row(90, 5), row(110, 7), row(110, 9)];

  // Both words are same-hand (left) pairs against a same-hand baseline
  // of ~117ms: "qx" predicts ~2.2× (hard), "wc" ~1.5× (moderate).
  const bigramModels = new Map<string, ModelState>([
    ["qx", warm(260)],
    ["wc", warm(180)],
    ["sd", warm(100, 300)],
    ["fe", warm(100, 300)],
  ]);

  it("serves the hardest words when fresh", () => {
    const rng = SEED_RNG();
    let qx = 0;
    for (let t = 0; t < 200; t++) {
      const r = selectWords({
        count: 1, pool: ["qx", "wc"], ...EMPTY, bigramModels, rng, nowMs: NOW,
      });
      if (r.words[0] === "qx") qx++;
    }
    expect(qx).toBeGreaterThan(100);
  });

  it("eases the ceiling and softens concentration when fading", () => {
    const rng = SEED_RNG();
    for (let t = 0; t < 200; t++) {
      const r = selectBatches(
        {
          count: 1, pool: ["qx", "wc"], ...EMPTY, bigramModels, rng,
          recentTests: fading, nowMs: NOW,
        },
        1,
      );
      expect(r.pacing.challengeHigh).toBeLessThan(CHALLENGE_HIGH);
      expect(r.pacing.concentration).toBeLessThan(WEAKNESS_CONCENTRATION);
      // A word predicted at ~2.2× is above the tired ceiling.
      expect(r.batches[0]).toEqual(["wc"]);
    }
  });

  it("ignores a fade from an earlier session", () => {
    const r = selectBatches(
      {
        count: 1, pool: ["qx", "wc"], ...EMPTY, bigramModels,
        rng: SEED_RNG(), recentTests: fading, nowMs: NOW + 3 * 3_600_000,
      },
      1,
    );
    expect(r.pacing.challengeHigh).toBe(CHALLENGE_HIGH);
  });
});
