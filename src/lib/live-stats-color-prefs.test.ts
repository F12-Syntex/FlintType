import { describe, expect, it } from "vitest";
import {
  LEGACY_LIVE_STATS_COLOR,
  LIVE_STATS_COLOR_PICKED,
  liveStatsColorOf,
  liveStatsColorPatch,
  withLiveStatsColor,
} from "./live-stats-color-prefs";

describe("liveStatsColorOf", () => {
  it("reads the old shipped default as follow-the-palette", () => {
    expect(liveStatsColorOf({ liveStatsColor: LEGACY_LIVE_STATS_COLOR })).toBe("");
    expect(liveStatsColorOf({ liveStatsColor: "#F97316" })).toBe("");
  });

  it("keeps an orange the user picked from the settings", () => {
    const stored = { liveStatsColor: "", ...liveStatsColorPatch("#f97316") };
    expect(liveStatsColorOf(stored)).toBe("#f97316");
  });

  it("keeps any other colour, stamped or not", () => {
    expect(liveStatsColorOf({ liveStatsColor: "#3b82f6" })).toBe("#3b82f6");
    expect(liveStatsColorOf({ liveStatsColor: "" })).toBe("");
    expect(liveStatsColorOf({})).toBe("");
  });
});

describe("liveStatsColorPatch", () => {
  it("stamps the pick with the colour", () => {
    expect(liveStatsColorPatch("#f97316")).toEqual({
      liveStatsColor: "#f97316",
      [LIVE_STATS_COLOR_PICKED]: true,
    });
  });
});

describe("withLiveStatsColor", () => {
  it("returns the same object when there is nothing to map", () => {
    const stored = { liveStatsColor: "#3b82f6", tape: "off" };
    expect(withLiveStatsColor(stored)).toBe(stored);
  });

  it("maps the legacy hex and keeps the other fields", () => {
    expect(
      withLiveStatsColor({ liveStatsColor: "#f97316", tape: "word" }),
    ).toEqual({ liveStatsColor: "", tape: "word" });
  });

  it("keeps a picked orange and drops the stamp from the prefs", () => {
    const stored = { liveStatsColor: "#f97316", [LIVE_STATS_COLOR_PICKED]: true };
    expect(withLiveStatsColor(stored)).toEqual({ liveStatsColor: "#f97316" });
  });
});
