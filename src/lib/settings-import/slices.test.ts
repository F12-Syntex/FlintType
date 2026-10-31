// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  useBackend: () => ({ prefs: { get: async () => ({}), merge: async () => ({ ok: true }) } }),
}));

vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ isSignedIn: false, isLoaded: true, user: null }) }));

import { DEFAULT_PRACTICE_SLICE } from "@/app/_components/practice-state";
import { __resetForTests, loadPrefs, writeSlice } from "../prefs-store";
import { PRACTICE_DEFAULTS, rawSlice, readCurrentSettings, SLICE_DEFAULTS } from "./slices";

describe("PRACTICE_DEFAULTS", () => {
  it("are the practice provider's own defaults", () => {
    expect(PRACTICE_DEFAULTS).toEqual(DEFAULT_PRACTICE_SLICE);
  });
});

beforeEach(async () => {
  window.localStorage.clear();
  __resetForTests();
  await loadPrefs();
});

describe("rawSlice", () => {
  it("returns a slice exactly as stored, or an empty object", () => {
    writeSlice("caret", { width: 5 });
    expect(rawSlice("caret")).toEqual({ width: 5 });
    expect(rawSlice("missing")).toEqual({});
    writeSlice("odd", [1, 2]);
    expect(rawSlice("odd")).toEqual({});
  });
});

describe("readCurrentSettings", () => {
  it("merges every slice over its defaults", () => {
    writeSlice("caret", { width: 5 });
    const cur = readCurrentSettings("dark");
    expect(cur.slices.caret).toEqual({ ...SLICE_DEFAULTS.caret, width: 5 });
    expect(cur.slices.practice).toEqual(SLICE_DEFAULTS.practice);
    expect(cur.mode).toBe("dark");
  });

  it("reads the old shipped live stats hex as following the palette", () => {
    writeSlice("appearance", { liveStatsColor: "#f97316" });
    expect(readCurrentSettings(null).slices.appearance.liveStatsColor).toBe("");
    writeSlice("appearance", { liveStatsColor: "#f97316", liveStatsColorPicked: true });
    expect(readCurrentSettings(null).slices.appearance.liveStatsColor).toBe("#f97316");
  });

  it("keeps only text overrides, and Default when no palette is stored", () => {
    writeSlice("theme", { "--primary": "#123456", "--card": 5 });
    const cur = readCurrentSettings(null);
    expect(cur.theme).toEqual({ "--primary": "#123456" });
    expect(cur.palette).toEqual({ activeId: null });
  });

  it("says whether this device has an uploaded background", () => {
    expect(readCurrentSettings(null).uploadedImage).toBeUndefined();
    window.localStorage.setItem("ft-bg-local-image", "data:image/png;base64,AAAA");
    expect(readCurrentSettings(null).uploadedImage).toBe(true);
  });
});
