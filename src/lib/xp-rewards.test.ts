import { describe, expect, it } from "vitest";

import { XP_PER_TEST } from "./level";
import {
  XP_PER_DRILL,
  XP_PER_RACE_FINISH,
  XP_PER_RACE_WIN,
  computeTotalXp,
} from "./xp-rewards";

describe("computeTotalXp", () => {
  it("returns 0 for an empty counts object", () => {
    expect(computeTotalXp({})).toBe(0);
  });

  it("sums tests × XP_PER_TEST + drills × XP_PER_DRILL", () => {
    expect(
      computeTotalXp({ testsCompleted: 3, drillsCompleted: 2 }),
    ).toBe(3 * XP_PER_TEST + 2 * XP_PER_DRILL);
  });

  it("adds race finish + win", () => {
    // 4 races, won 2 of them.
    expect(
      computeTotalXp({ racesFinished: 4, racesWon: 2 }),
    ).toBe(4 * XP_PER_RACE_FINISH + 2 * XP_PER_RACE_WIN);
  });

  it("clamps racesWon to racesFinished (garbled input doesn't explode)", () => {
    expect(
      computeTotalXp({ racesFinished: 1, racesWon: 10 }),
    ).toBe(XP_PER_RACE_FINISH + XP_PER_RACE_WIN);
  });

  it("clamps negative + fractional inputs defensively", () => {
    expect(
      computeTotalXp({
        testsCompleted: -5,
        drillsCompleted: 3.9,
        racesFinished: -1,
        racesWon: 1,
      }),
    ).toBe(3 * XP_PER_DRILL);
  });
});
