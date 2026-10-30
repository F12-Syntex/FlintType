import { describe, expect, it } from "vitest";
import type { LeaderboardFilters } from "./filters";
import {
  describeSlice,
  filterSummaryParts,
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

describe("filterSummaryParts", () => {
  it("names each part of the slice in plain words", () => {
    expect(filterSummaryParts(DEFAULTS)).toEqual(["Casual", "60 seconds", "All time"]);
    expect(
      filterSummaryParts({ ...DEFAULTS, preset: "w25", window: "day", audience: "friends" }),
    ).toEqual(["Friends", "Casual", "25 words", "Today"]);
    expect(filterSummaryParts({ ...DEFAULTS, preset: "any" })).toEqual([
      "Casual",
      "All lengths",
      "All time",
    ]);
  });
});

describe("runLengthLabel", () => {
  it("takes the unit from a pinned preset, not the number", () => {
    expect(runLengthLabel(60, "t60")).toBe("60 seconds");
    expect(runLengthLabel(25, "w25")).toBe("25 words");
    // A custom 30-word run on a words board never reads as seconds.
    expect(runLengthLabel(30, "w25")).toBe("30 words");
    expect(runLengthLabel(45, "t30")).toBe("45 seconds");
  });

  it("guesses from the stock time amounts on All lengths", () => {
    expect(runLengthLabel(15, "any")).toBe("15 seconds");
    expect(runLengthLabel(120, "any")).toBe("120 seconds");
    expect(runLengthLabel(50, "any")).toBe("50 words");
    expect(runLengthLabel(1, "any")).toBe("1 word");
  });

  it("prefers the row's own unit when the server sends one", () => {
    // A 60-word run on All lengths no longer reads as 60 seconds.
    expect(runLengthLabel(60, "any", "words")).toBe("60 words");
    expect(runLengthLabel(50, "any", "time")).toBe("50 seconds");
    expect(runLengthLabel(40, "any", "quote")).toBe("40 words");
    // Legacy rows (null) keep the old fallback.
    expect(runLengthLabel(60, "any", null)).toBe("60 seconds");
  });
});

describe("otherScope", () => {
  it("offers the other ranked mode", () => {
    expect(otherScope("casual")).toEqual({ id: "training", label: "Adapt" });
    expect(otherScope("training")).toEqual({ id: "casual", label: "Casual" });
  });
});
