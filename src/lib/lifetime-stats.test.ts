import { describe, expect, it } from "vitest";

import { DEFAULT_LIFETIME_STATS, readLifetimeStats } from "./lifetime-stats";

describe("readLifetimeStats", () => {
  it("falls back to defaults when prefs is missing the slice", () => {
    expect(readLifetimeStats(null)).toEqual(DEFAULT_LIFETIME_STATS);
    expect(readLifetimeStats(undefined)).toEqual(DEFAULT_LIFETIME_STATS);
    expect(readLifetimeStats({})).toEqual(DEFAULT_LIFETIME_STATS);
  });

  it("reads valid numeric fields", () => {
    expect(
      readLifetimeStats({
        lifetimeStats: { drillsCompleted: 3, racesFinished: 5, racesWon: 1 },
      }),
    ).toEqual({ drillsCompleted: 3, racesFinished: 5, racesWon: 1 });
  });

  it("ignores garbled / negative / non-numeric values", () => {
    expect(
      readLifetimeStats({
        lifetimeStats: {
          drillsCompleted: -3,
          racesFinished: "not a number",
          racesWon: 2.9,
        },
      }),
    ).toEqual({ drillsCompleted: 0, racesFinished: 0, racesWon: 2 });
  });

  it("tolerates a non-object slice", () => {
    expect(
      readLifetimeStats({ lifetimeStats: "garbage" } as Record<string, unknown>),
    ).toEqual(DEFAULT_LIFETIME_STATS);
  });
});
