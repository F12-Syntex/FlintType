import { describe, expect, it } from "vitest";
import type { LeaderboardFilters } from "./filters";
import {
  describeSlice,
  filterSummary,
  otherScope,
  runLengthLabel,
} from "./slice-labels";

const DEFAULTS: LeaderboardFilters = {
  view: "table",
  scope: "casual",
  window: "all_time",
  preset: "t60",
  audience: "global",
};

describe("describeSlice", () => {
  it("names mode and length by default", () => {
    expect(describeSlice(DEFAULTS)).toBe("casual runs at 60 seconds");
  });

  it("adds window and audience, drops length for all lengths", () => {
    expect(
      describeSlice({
        ...DEFAULTS,
        scope: "training",
        preset: "any",
        window: "week",
        audience: "friends",
      }),
    ).toBe("adapt runs this week from friends");
  });
});

describe("filterSummary", () => {
  it("summarises the slice compactly", () => {
    expect(filterSummary(DEFAULTS)).toBe("Casual · 60s · All time");
    expect(
      filterSummary({ ...DEFAULTS, preset: "w25", window: "day", audience: "friends" }),
    ).toBe("Friends · Casual · 25 words · Today");
    expect(filterSummary({ ...DEFAULTS, preset: "any" })).toBe(
      "Casual · All lengths · All time",
    );
  });
});

describe("runLengthLabel", () => {
  it("takes the unit from a pinned preset, not the number", () => {
    expect(runLengthLabel(60, "t60")).toBe("60s");
    expect(runLengthLabel(25, "w25")).toBe("25 words");
    // A custom 30-word run on a words board never reads as seconds.
    expect(runLengthLabel(30, "w25")).toBe("30 words");
    expect(runLengthLabel(45, "t30")).toBe("45s");
  });

  it("guesses from the stock time amounts on All lengths", () => {
    expect(runLengthLabel(15, "any")).toBe("15s");
    expect(runLengthLabel(120, "any")).toBe("120s");
    expect(runLengthLabel(50, "any")).toBe("50 words");
    expect(runLengthLabel(1, "any")).toBe("1 word");
  });
});

describe("otherScope", () => {
  it("offers the other ranked mode", () => {
    expect(otherScope("casual")).toEqual({ id: "training", label: "Adapt" });
    expect(otherScope("training")).toEqual({ id: "casual", label: "Casual" });
  });
});
