import { describe, expect, it } from "vitest";
import {
  bigramRowsToStates,
  deltasFor,
  motorFeatureRowsToStates,
  trigramRowsToStates,
} from "./apply";
import type { ModelState } from "./welford";

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

  it("bigramRowsToStates keys by bigram column", () => {
    const states = bigramRowsToStates([
      {
        userId: "u1",
        bigram: "th",
        meanMs: 120,
        varianceMs: 100,
        sampleCount: 5,
        updatedAt: new Date(),
      },
    ]);
    expect(states.get("th")).toEqual({ mean: 120, variance: 100, n: 5 });
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
});
