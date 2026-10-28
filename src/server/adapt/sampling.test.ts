import { describe, expect, it } from "vitest";
import {
  COVERAGE_DECAY,
  pickWithCoverage,
  sampleWeighted,
  weightedPickIndex,
} from "./sampling";

describe("sampleWeighted", () => {
  it("returns [] for an empty pool", () => {
    expect(sampleWeighted([], 5)).toEqual([]);
  });

  it("clamps count to pool size", () => {
    const out = sampleWeighted(
      [
        { word: "a", weight: 1 },
        { word: "b", weight: 1 },
      ],
      10,
    );
    expect(out.length).toBe(2);
  });

  it("does not pick the same word twice", () => {
    const out = sampleWeighted(
      [
        { word: "a", weight: 1 },
        { word: "b", weight: 1 },
        { word: "c", weight: 1 },
      ],
      3,
    );
    expect(new Set(out).size).toBe(3);
  });

  it("biases toward higher-weight candidates", () => {
    const counts = new Map<string, number>([
      ["heavy", 0],
      ["light", 0],
    ]);
    let seed = 1;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 0x100000000;
      return seed / 0x100000000;
    };
    for (let i = 0; i < 1000; i++) {
      const [pick] = sampleWeighted(
        [
          { word: "heavy", weight: 100 },
          { word: "light", weight: 1 },
        ],
        1,
        rng,
      );
      counts.set(pick!, (counts.get(pick!) ?? 0) + 1);
    }
    expect(counts.get("heavy")!).toBeGreaterThan(counts.get("light")!);
  });

  it("falls back to uniform when every weight is 0", () => {
    const out = sampleWeighted(
      [
        { word: "a", weight: 0 },
        { word: "b", weight: 0 },
      ],
      2,
    );
    expect(out.sort()).toEqual(["a", "b"]);
  });
});

describe("weightedPickIndex", () => {
  it("never picks a zero-weight entry, even when the draw lands on 0", () => {
    expect(weightedPickIndex([0, 0, 5], () => 0)).toBe(2);
    expect(weightedPickIndex([0, 3, 0], () => 0)).toBe(1);
  });

  it("returns the last positive entry on float leftovers", () => {
    // rng just under 1 → r ≈ total; must land on a weighted entry.
    expect(weightedPickIndex([2, 1, 0], () => 0.999999999)).toBe(1);
  });

  it("falls back to uniform when every weight is 0", () => {
    expect(weightedPickIndex([0, 0, 0, 0], () => 0.6)).toBe(2);
  });
});

describe("pickWithCoverage", () => {
  const seeded = () => {
    let s = 7;
    return () => {
      s = (s * 1664525 + 1013904223) % 0x100000000;
      return s / 0x100000000;
    };
  };

  it("returns distinct words, capped at the pool size", () => {
    const out = pickWithCoverage(
      [
        { word: "a", weight: 1, patterns: ["p"] },
        { word: "b", weight: 1, patterns: ["p"] },
      ],
      5,
      seeded(),
    );
    expect(out.sort()).toEqual(["a", "b"]);
  });

  it("damps a candidate whose pattern starts partially covered", () => {
    // Two equal-weight candidates; "drilled" carries a pattern recent
    // tests already dosed fully (initial overlap 1 → ×COVERAGE_DECAY).
    const items = [
      { word: "drilled", weight: 1, patterns: ["b:br"] },
      { word: "fresh", weight: 1, patterns: ["b:kx"] },
    ];
    const rng = seeded();
    let fresh = 0;
    const TRIALS = 2000;
    for (let i = 0; i < TRIALS; i++) {
      const [w] = pickWithCoverage(items, 1, rng, new Map([["b:br", 1]]));
      if (w === "fresh") fresh++;
    }
    const expected = 1 / (1 + COVERAGE_DECAY);
    expect(fresh / TRIALS).toBeGreaterThan(expected - 0.05);
    expect(fresh / TRIALS).toBeLessThan(expected + 0.05);
  });
});
