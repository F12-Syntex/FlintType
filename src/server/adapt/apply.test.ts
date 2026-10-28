import { describe, expect, it } from "vitest";
import {
  bigramRowsToStates,
  deltasFor,
  interleave,
  motorFeatureRowsToStates,
  trigramRowsToStates,
} from "./apply";
import { STALENESS_HALF_LIFE_DAYS, type ModelState } from "./welford";

describe("apply", () => {
  it("deltasFor seeds new keys", () => {
    const existing = new Map<string, ModelState>();
    const samples = new Map([["th", [120, 110, 130]]]);
    const out = deltasFor(existing, samples);
    expect(out.has("th")).toBe(true);
    expect(out.get("th")!.sampleCount).toBe(3);
  });

  it("deltasFor extends existing keys", () => {
    const existing = new Map<string, ModelState>([
      ["th", { mean: 120, variance: 100, n: 5 }],
    ]);
    const samples = new Map([["th", [110]]]);
    const out = deltasFor(existing, samples);
    expect(out.get("th")!.sampleCount).toBe(6);
  });

  it("deltasFor skips empty sample arrays", () => {
    const out = deltasFor(new Map(), new Map([["th", []]]));
    expect(out.size).toBe(0);
  });

  it("deltasFor returns nothing for an empty input", () => {
    expect(deltasFor(new Map(), new Map()).size).toBe(0);
  });

  it("bigramRowsToStates keys by bigram column and carries updatedAt as lastSeenMs", () => {
    const updatedAt = new Date(1_700_000_000_000);
    const states = bigramRowsToStates([
      {
        userId: "u1",
        bigram: "th",
        meanMs: 120,
        varianceMs: 100,
        sampleCount: 5,
        updatedAt,
      },
    ]);
    expect(states.get("th")).toEqual({
      mean: 120,
      variance: 100,
      n: 5,
      lastSeenMs: updatedAt.getTime(),
    });
  });

  it("trigramRowsToStates keys by trigram column", () => {
    const states = trigramRowsToStates([
      {
        userId: "u1",
        trigram: "the",
        meanMs: 200,
        varianceMs: 500,
        sampleCount: 3,
        updatedAt: new Date(),
      },
    ]);
    expect(states.get("the")?.n).toBe(3);
  });

  it("motorFeatureRowsToStates keys by featureKey", () => {
    const states = motorFeatureRowsToStates([
      {
        userId: "u1",
        featureKey: "same_finger_L5",
        meanMs: 250,
        varianceMs: 1000,
        sampleCount: 4,
        updatedAt: new Date(),
      },
    ]);
    expect(states.get("same_finger_L5")?.mean).toBe(250);
  });

  it("deltasFor folds slip costs into the same running mean", () => {
    const existing = new Map<string, ModelState>([
      ["th", { mean: 100, variance: 100, n: 40 }],
    ]);
    const clean = new Map([["th", [100, 100, 100]]]);
    const withSlip = deltasFor(existing, clean, {
      slips: new Map([["th", [600]]]),
    });
    const cleanOnly = deltasFor(existing, clean);
    expect(withSlip.get("th")!.sampleCount).toBe(44);
    expect(withSlip.get("th")!.meanMs).toBeGreaterThan(cleanOnly.get("th")!.meanMs);
  });

  it("deltasFor writes keys that only have slips", () => {
    const out = deltasFor(new Map(), new Map(), {
      slips: new Map([["qz", [500]]]),
    });
    expect(out.get("qz")).toEqual({ meanMs: 500, varianceMs: 0, sampleCount: 1 });
  });

  it("deltasFor re-learns a long-unpractised pattern faster", () => {
    const DAY = 86_400_000;
    const now = 200 * DAY;
    const prev = { mean: 200, variance: 0, n: 40 };
    const samples = new Map([["th", [120]]]);
    const fresh = deltasFor(new Map([["th", { ...prev, lastSeenMs: now }]]), samples, { nowMs: now });
    const stale = deltasFor(
      new Map([["th", { ...prev, lastSeenMs: now - 4 * STALENESS_HALF_LIFE_DAYS * DAY }]]),
      samples,
      { nowMs: now },
    );
    expect(stale.get("th")!.meanMs).toBeLessThan(fresh.get("th")!.meanMs);
  });

  it("deltasFor runs shift detection on clean samples only", () => {
    // Clean timings match the settled mean; two slips must not be read
    // as a change in speed (which would apply the fast shift rate).
    const settled = new Map<string, ModelState>([
      ["th", { mean: 200, variance: 900, n: 60 }],
    ]);
    const clean = new Map([["th", [200, 201, 199]]]);
    const slips = new Map([["th", [900, 900]]]);
    const out = deltasFor(settled, clean, { slips });
    // Floor-rate folding of two 700ms-above-mean samples moves the mean
    // by well under the 30%+ a shift reset would.
    expect(out.get("th")!.meanMs - 200).toBeLessThan(0.2 * 700);
  });

  it("interleave spreads extras evenly and keeps order", () => {
    expect(interleave([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [99])).toEqual([
      1, 2, 3, 4, 5, 99, 6, 7, 8, 9, 10,
    ]);
    expect(interleave([1, 2], [])).toEqual([1, 2]);
    expect(interleave([], [7, 8])).toEqual([7, 8]);
    const mixed = interleave([1, 2, 3, 4], [8, 9]);
    expect(mixed.length).toBe(6);
    expect(mixed.filter((v) => v < 5)).toEqual([1, 2, 3, 4]);
    expect(mixed.filter((v) => v > 5)).toEqual([8, 9]);
    // Neither extra sits at the very end.
    expect(mixed[mixed.length - 1]).toBeLessThan(5);
  });
});
