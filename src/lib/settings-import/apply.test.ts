// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real prefs store, with only the backend replaced by a fake server
// that replaces each slice it's sent, as the real merge route does.
let server: Record<string, unknown> = {};
let offline = false;
vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: async () => JSON.parse(JSON.stringify(server)),
      merge: async (input: { data: Record<string, unknown>; remove?: string[] }) => {
        if (offline) throw new Error("offline");
        server = { ...server, ...JSON.parse(JSON.stringify(input.data)) };
        for (const k of input.remove ?? []) delete server[k];
        return { ok: true };
      },
    },
  }),
}));

import type { ImportItem } from "@/types/settings-import";
import { __resetForTests, getCache, loadPrefs, readSlice, writeSlice } from "../prefs-store";
import { paletteAfterOverrideWrite, type PaletteSlice } from "../themes/palette-fork";
import { CUSTOM_THEME_ID } from "../themes/registry";
import { applyItems, undoImport, type ModeAccess } from "./apply";
import sample from "./fixtures/monkeytype-settings.json";
import { planFlinttype } from "./flinttype";
import { planMonkeytype } from "./monkeytype";
import { readCurrentSettings } from "./slices";
import { createUndoPoint } from "./undo-point";

const META = "flinttype:prefs:meta";

/** A user who has changed a lot already. */
function seed() {
  writeSlice("appearance", {
    controlShape: "square", depth: "lifted", uiFont: "mono", uiScale: "large", pageAura: false,
    borders: "hidden", keymapCompact: false, keymapSize: 1.4, mistakeStyle: "highlight",
    liveStatsColor: "#22c55e", liveStatsColorPicked: true, footerStyle: "compact",
  });
  writeSlice("caret", { width: 5, radius: 0, blinkSpeed: 500, style: "block" });
  writeSlice("behaviour", { minWordLength: 3, allowExtras: false, burstThreshold: 80 });
  writeSlice("background", { imageUrl: "https://example.com/mine.jpg", scope: "content", darken: 0.2 });
  writeSlice("keyboard", { design: "solid", shape: "pill" });
  writeSlice("practice", { mode: "WORDS", length: 50, adapt: false, wordlist: "english_1k" });
  writeSlice("theme", { "--radius": "0rem", "--ft-word-spacing": "0.45em" });
  writeSlice("palette", { activeId: "nord" });
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let mode: string | null;
const modeAccess: ModeAccess = { get: () => mode, set: (m) => { mode = m; } };

beforeEach(async () => {
  window.localStorage.clear();
  __resetForTests();
  server = {};
  offline = false;
  mode = "light";
  await loadPrefs();
  seed();
});

function planSample() {
  return planMonkeytype(sample, readCurrentSettings(mode), "sample-settings.json");
}

describe("applying a MonkeyType import", () => {
  it("changes only the settings it lists", () => {
    const before = clone(getCache()!);
    const plan = planSample();
    const listed = plan.groups.flatMap((g) => g.items);
    const undo = createUndoPoint();
    for (const g of plan.groups) applyItems(g.items, undo, modeAccess);
    const after = getCache()!;

    // Every slice field the import doesn't list is exactly as it was.
    const written = new Map<string, Set<string>>();
    for (const i of listed) {
      if (i.target.kind !== "slice") continue;
      const set = written.get(i.target.slice) ?? new Set<string>();
      set.add(i.target.field);
      for (const k of Object.keys(i.extra ?? {})) set.add(k);
      written.set(i.target.slice, set);
    }
    for (const slice of ["appearance", "caret", "behaviour", "background", "keyboard", "practice", "audio"]) {
      const was = (before[slice] ?? {}) as Record<string, unknown>;
      const now = (after[slice] ?? {}) as Record<string, unknown>;
      for (const field of new Set([...Object.keys(was), ...Object.keys(now)])) {
        if (written.get(slice)?.has(field)) continue;
        expect([slice, field, now[field]]).toEqual([slice, field, was[field]]);
      }
    }
    // The user's own picks the file doesn't touch survive.
    expect(after.appearance).toMatchObject({ controlShape: "square", depth: "lifted", uiFont: "mono", keymapSize: 1.1 });
    expect(after.background).toEqual(before.background);
    expect(after.practice).toMatchObject({ mode: "TIME", length: 15, adapt: false, wordlist: "english" });
    expect(after.theme).toMatchObject({ "--radius": "0rem", "--ft-word-spacing": "0.45em", "--background": "#132237" });
    // The palette forks to Custom off the palette the user was on.
    expect(after.palette).toMatchObject({ activeId: "custom", base: { id: "nord" } });
    expect(mode).toBe("dark");
  });

  it("marks only the listed fields as changed, so a reload keeps the rest", async () => {
    // Let the seed sync first, so nothing is left marked as changed.
    await vi.waitFor(() => expect(JSON.parse(window.localStorage.getItem(META)!).dirty).toEqual({}), { timeout: 3000 });
    const plan = planSample();
    for (const g of plan.groups) applyItems(g.items, createUndoPoint(), modeAccess);
    const dirty = JSON.parse(window.localStorage.getItem(META)!).dirty as Record<string, string[]>;
    const expected: Record<string, string[]> = {};
    for (const i of plan.groups.flatMap((g) => g.items)) {
      if (i.target.kind !== "slice") continue;
      const list = (expected[i.target.slice] ??= []);
      list.push(i.target.field, ...Object.keys(i.extra ?? {}));
    }
    for (const slice of Object.keys(expected)) {
      expect([slice, [...dirty[slice]].sort()]).toEqual([slice, [...expected[slice]].sort()]);
    }
    expect(dirty.theme.length).toBe(20);
  });

  it("puts everything back on undo, its save record included", async () => {
    const before = clone(getCache()!);
    const metaBefore = window.localStorage.getItem(META);
    const plan = planSample();
    const undo = createUndoPoint();
    for (const g of plan.groups) applyItems(g.items, undo, modeAccess);
    const undone = undoImport(undo, modeAccess);
    // The values are back at once.
    expect(getCache()).toEqual(before);
    expect(mode).toBe("light");
    await undone;
    expect(window.localStorage.getItem(META)).toBe(metaBefore);
  });

  it("removes slices the import created, palette included, without tombstones", async () => {
    __resetForTests();
    window.localStorage.clear();
    await loadPrefs();
    const before = clone(getCache()!);
    const metaBefore = JSON.parse(window.localStorage.getItem(META) ?? "null");
    const plan = planSample();
    const undo = createUndoPoint();
    for (const g of plan.groups) applyItems(g.items, undo, modeAccess);
    expect(getCache()!.palette).toEqual({ activeId: "custom" });
    await undoImport(undo, modeAccess);
    expect(getCache()).toEqual(before);
    const meta = JSON.parse(window.localStorage.getItem(META)!);
    expect(meta).toMatchObject({ d: [], r: [], dirty: {}, removed: [], v: metaBefore?.v ?? 0 });
  });

  it("restores theme overrides the import cleared", async () => {
    writeSlice("theme", { "--ft-font-scale": "1.5" });
    const clear: ImportItem = {
      id: "theme.--ft-font-scale", label: "Size", now: "60px", to: "40px",
      target: { kind: "theme", name: "--ft-font-scale" }, value: null,
    };
    const undo = createUndoPoint();
    applyItems([clear], undo, modeAccess);
    expect((getCache()!.theme as Record<string, string>)["--ft-font-scale"]).toBeUndefined();
    await undoImport(undo, modeAccess);
    expect((getCache()!.theme as Record<string, string>)["--ft-font-scale"]).toBe("1.5");
    expect(getCache()!.palette).toEqual({ activeId: "nord" });
  });
});

const synced = () =>
  vi.waitFor(() => expect(JSON.parse(window.localStorage.getItem(META)!).dirty).toEqual({}), { timeout: 3000 });

describe("undo across a reload", () => {
  it("stays undone when the undo's save never reached the server", async () => {
    await synced();
    const before = clone(getCache()!);
    const plan = planSample();
    const undo = createUndoPoint();
    for (const g of plan.groups) applyItems(g.items, undo, modeAccess);
    await synced(); // the import reached the server
    offline = true;
    await undoImport(undo, modeAccess);
    await new Promise((r) => setTimeout(r, 600)); // the undo's save fails
    __resetForTests();
    offline = false;
    await loadPrefs();
    expect(getCache()).toEqual(before);
  });
});

describe("applying a flinttype palette", () => {
  const groups = [{ id: "all", name: "All" }];
  const planFt = (slices: Record<string, unknown>) =>
    planFlinttype(slices, readCurrentSettings(mode), { fileLabel: null, settingsInFile: 1 }, groups, () => "all");

  it("never leaves a named palette under overrides it doesn't set", () => {
    writeSlice("theme", { "--primary": "#00ff00", "--ft-font-scale": "1.5" });
    // An older file with a palette but no overrides at all.
    const plan = planFt({ palette: { activeId: "dracula" } });
    for (const g of plan.groups) applyItems(g.items, createUndoPoint(), modeAccess);
    const theme = readSlice<Record<string, string>>("theme", {});
    const palette = readSlice<PaletteSlice>("palette", { activeId: null });
    expect(theme).toEqual({});
    expect(palette.activeId).toBe("dracula");
    // The picker's rule holds: the palette is what the overrides say.
    expect(paletteAfterOverrideWrite(palette, theme, CUSTOM_THEME_ID)).toBe(palette);
  });

  it("forks the file's palette when a group with overrides stays off", () => {
    writeSlice("theme", { "--ft-font-scale": "1.5" });
    const plan = planFlinttype(
      { palette: { activeId: "dracula" }, theme: {} },
      readCurrentSettings(mode),
      { fileLabel: null, settingsInFile: 1 },
      [{ id: "colours", name: "Colours" }, { id: "font", name: "Font" }],
      (t) => (t.kind === "theme" && t.name === "--ft-font-scale" ? "font" : "colours"),
    );
    applyItems(plan.groups.find((g) => g.id === "colours")!.items, createUndoPoint(), modeAccess);
    expect(readSlice<PaletteSlice>("palette", { activeId: null })).toMatchObject({ activeId: "custom", base: { id: "dracula" } });
  });
});
