import { describe, expect, it } from "vitest";
import {
  RECENCY_FLOOR,
  RECENCY_RECOVERY_TESTS,
  advanceRecency,
  recencyMultiplier,
} from "./recency";

describe("recencyMultiplier", () => {
  it("is at floor when shown in the test we just ran", () => {
    expect(recencyMultiplier(0)).toBeCloseTo(RECENCY_FLOOR, 5);
  });

  it("recovers to 1.0 after the recovery window", () => {
    expect(recencyMultiplier(RECENCY_RECOVERY_TESTS)).toBe(1);
    expect(recencyMultiplier(100)).toBe(1);
  });

  it("interpolates linearly in between", () => {
    const half = recencyMultiplier(RECENCY_RECOVERY_TESTS / 2);
    expect(half).toBeGreaterThan(RECENCY_FLOOR);
    expect(half).toBeLessThan(1);
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
