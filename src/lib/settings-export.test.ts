// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real prefs store, with the backend standing in for a signed-out user.
vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: async () => ({}),
      merge: async () => ({ ok: true }),
    },
  }),
}));

import { __resetForTests, getCache, loadPrefs, readSlice, writeSlice } from "./prefs-store";
import { buildFlinttypeExport, EXPORT_SLICES } from "./settings-export";
import { applyItems, type ModeAccess } from "./settings-import/apply";
import { createUndoPoint } from "./settings-import/undo-point";
import { FT_FIELDS } from "./settings-import/ft-fields";
import { planFlinttype } from "./settings-import/flinttype";
import { IMPORT_SLICES, PRACTICE_DEFAULTS, readCurrentSettings, SLICE_DEFAULTS } from "./settings-import/slices";
import { DEFAULT_CARET } from "./caret-settings";
import { DEFAULT_HAND_LAYOUT } from "./hand-layout";
import { setThemeVar } from "./theme-customization";
import { paletteSliceFor } from "./themes/palette-baseline";

const mode: ModeAccess = { get: () => "dark", set: () => {} };

beforeEach(async () => {
  window.localStorage.clear();
  __resetForTests();
  await loadPrefs();
});

/** Import a file the way the dialog does, every group switched on. */
function importFile(slices: Record<string, unknown>) {
  const plan = planFlinttype(slices, readCurrentSettings("dark"), { fileLabel: null, settingsInFile: 1 }, [
    { id: "all", name: "All" },
  ], () => "all");
  const undo = createUndoPoint();
  for (const g of plan.groups) applyItems(g.items, undo, mode);
  return plan;
}

const snapshot = () =>
  Object.fromEntries([
    ...IMPORT_SLICES.map((k) => [k, readSlice(k, SLICE_DEFAULTS[k])]),
    ["theme", readSlice("theme", {})],
    ["palette", (readSlice("palette", { activeId: null }) as { activeId: unknown }).activeId],
  ]);

describe("buildFlinttypeExport", () => {
  it("exports every settings slice in full, defaults included", async () => {
    writeSlice("caret", { style: "block" });
    writeSlice("experiment", { old: true });
    writeSlice("adaptRecency", { server: "owned" });
    const out = await buildFlinttypeExport();
    expect(out).toMatchObject({ app: "flinttype", version: 1 });
    expect(Object.keys(out.slices).sort()).toEqual([...EXPORT_SLICES].sort());
    for (const key of IMPORT_SLICES) {
      const fields = key === "handLayout" ? ["fingers"] : Object.keys(FT_FIELDS[key]);
      expect([key, Object.keys(out.slices[key] as object).sort()]).toEqual([key, fields.sort()]);
    }
    expect(out.slices.caret).toMatchObject({ style: "block", width: DEFAULT_CARET.width });
    expect(out.slices.practice).toEqual(PRACTICE_DEFAULTS);
    expect(out.slices.theme).toEqual({});
    expect(out.slices.palette).toEqual({ activeId: null });
    expect(Number.isNaN(Date.parse(out.exportedAt))).toBe(false);
  });

  it("leaves server-owned, unknown and stray fields out", async () => {
    writeSlice("appearance", { uiFont: "mono", leftover: 1 });
    writeSlice("theme", { "--primary": "#ff0000", display: "none" });
    const out = await buildFlinttypeExport();
    expect(out.slices.adaptRecency).toBeUndefined();
    expect((out.slices.appearance as Record<string, unknown>).leftover).toBeUndefined();
    expect(out.slices.theme).toEqual({ "--primary": "#ff0000" });
  });
});

describe("export then import", () => {
  it("restores every exported slice after changes made since", async () => {
    writeSlice("appearance", { uiFont: "mono", keymapSize: 1.3, liveStatsColor: "#f97316", liveStatsColorPicked: true });
    writeSlice("caret", { style: "block", width: 4 });
    writeSlice("behaviour", { minWordLength: 3 });
    writeSlice("background", { imageUrl: "https://example.com/a.png", blur: 4 });
    writeSlice("keyboard", { design: "glass" });
    writeSlice("audio", { keypressClickEnabled: true, keypressClickVolume: 30 });
    writeSlice("practice", { mode: "QUOTE", length: 2, adapt: false, wordlist: "english" });
    writeSlice("palette", paletteSliceFor("dracula"));
    setThemeVar("--primary", "#123456");
    const file = await buildFlinttypeExport();
    const saved = snapshot();

    // Change something in every slice, including fields still at their
    // defaults when the file was made, and add an override.
    writeSlice("appearance", { ...(getCache()!.appearance as object), depth: "flat", uiFont: "system", liveStatsColor: "#00ff00" });
    writeSlice("caret", { style: "line", radius: 0, width: 4 });
    writeSlice("behaviour", { minWordLength: 5, blindMode: true });
    writeSlice("background", { imageUrl: "", fit: "tile" });
    writeSlice("keyboard", { design: "solid", shape: "pill" });
    writeSlice("audio", { keypressClickEnabled: false });
    writeSlice("practice", { mode: "TIME", length: 60, adapt: true, wordlist: "english" });
    writeSlice("handLayout", { fingers: { ...DEFAULT_HAND_LAYOUT.fingers, L5: { enabled: false, homeKey: "KeyA" } } });
    setThemeVar("--ft-font-scale", "1.5");
    setThemeVar("--primary", "#00ff00");
    expect(snapshot()).not.toEqual(saved);

    const plan = importFile(file.slices);
    expect(plan.skipped).toEqual([]);
    expect(snapshot()).toEqual(saved);
  });
});
