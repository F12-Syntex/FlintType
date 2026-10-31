import { describe, expect, it } from "vitest";
import type { CurrentSettings } from "@/types/settings-import";
import {
  buildGroups, changeCount, currentLabel, isUnchanged, notImportedCount, sameJson, tallySettings, unchangedCount,
} from "./plan";
import { readCurrentSettings } from "./slices";

const fresh = (): CurrentSettings => readCurrentSettings(null);
const slice = (s: "appearance" | "background", field: string, value: unknown) => ({
  target: { kind: "slice" as const, slice: s, field },
  value,
});

describe("isUnchanged", () => {
  it("compares colours without case, and other text exactly", () => {
    const cur = fresh();
    cur.slices.appearance = { ...cur.slices.appearance, liveStatsColor: "#ABCDEF" };
    cur.slices.background = { ...cur.slices.background, imageUrl: "https://x.com/A.png" };
    expect(isUnchanged(slice("appearance", "liveStatsColor", "#abcdef"), cur)).toBe(true);
    expect(isUnchanged(slice("background", "imageUrl", "https://x.com/a.png"), cur)).toBe(false);
    expect(isUnchanged(slice("background", "imageUrl", "https://x.com/A.png"), cur)).toBe(true);
  });

  it("reads a numeric override at its default as no override", () => {
    const cur = fresh();
    cur.theme = { "--ft-font-scale": "1.0" };
    expect(isUnchanged({ target: { kind: "theme", name: "--ft-font-scale" }, value: null }, cur)).toBe(true);
    expect(isUnchanged({ target: { kind: "theme", name: "--primary" }, value: "#FFF" }, { ...cur, theme: { "--primary": "#fff" } })).toBe(true);
  });

  it("compares the palette by id and base, and the mode as set", () => {
    const cur = fresh();
    cur.palette = { activeId: "custom", base: { id: "nord" } };
    expect(isUnchanged({ target: { kind: "palette" }, value: { activeId: "custom", base: { id: "nord" } } }, cur)).toBe(true);
    expect(isUnchanged({ target: { kind: "palette" }, value: { activeId: "nord" } }, cur)).toBe(false);
    expect(isUnchanged({ target: { kind: "mode" }, value: "dark" }, { ...cur, mode: "system" })).toBe(false);
  });
});

describe("sameJson", () => {
  it("compares JSON values structurally, and gives up past eight levels", () => {
    expect(sameJson({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameJson([1], { 0: 1 })).toBe(false);
    let deep: unknown = 1;
    for (let i = 0; i < 12; i += 1) deep = [deep];
    expect(sameJson(deep, deep)).toBe(true);
    expect(sameJson(deep, JSON.parse(JSON.stringify(deep)))).toBe(false);
  });
});

describe("currentLabel", () => {
  it("labels your value now, with a swatch for a colour", () => {
    const cur = fresh();
    cur.theme = { "--primary": "#123456" };
    expect(currentLabel({ kind: "theme", name: "--primary" }, cur)).toEqual({ now: "#123456", nowSwatch: "#123456" });
    expect(currentLabel({ kind: "theme", name: "--card" }, cur)).toEqual({ now: "Palette's own" });
    // An unset colour shows the palette's colour on screen.
    const shown = { ...cur, shownColours: { "--card": "oklch(0.35 0.02 250)" } };
    expect(currentLabel({ kind: "theme", name: "--card" }, shown)).toEqual({ now: "Palette's own", nowSwatch: "oklch(0.35 0.02 250)" });
    expect(currentLabel({ kind: "slice", slice: "practice", field: "length" }, cur)).toEqual({ now: "25 words" });
    expect(currentLabel({ kind: "mode" }, { ...cur, mode: "light" })).toEqual({ now: "Light" });
    expect(currentLabel({ kind: "palette" }, { ...cur, palette: { activeId: "nord" } })).toEqual({ now: "Nord" });
  });
});

describe("buildGroups", () => {
  it("splits changes from matches, in group order, leaving out empty groups", () => {
    const cur = fresh();
    const groups = buildGroups(
      [{ id: "b", name: "B" }, { id: "a", name: "A" }, { id: "empty", name: "Empty" }],
      [
        { id: "x", group: "a", label: "X", to: "Mono", target: { kind: "slice", slice: "appearance", field: "uiFont" }, value: "mono" },
        { id: "y", group: "b", label: "Y", to: "Sans", target: { kind: "slice", slice: "appearance", field: "uiFont" }, value: "sans" },
      ],
      cur,
    );
    expect(groups.map((g) => [g.id, g.items.length, g.unchanged.length])).toEqual([["b", 0, 1], ["a", 1, 0]]);
    expect(groups[1].items[0]).toMatchObject({ now: "Sans", to: "Mono" });
    expect([changeCount(groups), changeCount(groups, new Set(["b"])), unchangedCount(groups)]).toEqual([1, 0, 1]);
  });
});

describe("buildGroups notes", () => {
  const candidate = { id: "x", group: "a", label: "X", to: "Mono", target: { kind: "slice" as const, slice: "appearance" as const, field: "uiFont" }, value: "mono" };

  it("follows a group's own note with the notes a planner adds for it", () => {
    const [a] = buildGroups([{ id: "a", name: "A", note: "One." }], [candidate], fresh(), [
      { group: "a", text: "Two." },
      { group: "b", text: "Not this one." },
      { group: "a", text: "Three." },
    ]);
    expect(a.note).toBe("One. Two. Three.");
  });

  it("gives a group with no notes none", () => {
    const [a] = buildGroups([{ id: "a", name: "A" }], [candidate], fresh());
    expect(a.note).toBeUndefined();
    const [b] = buildGroups([{ id: "a", name: "A" }], [candidate], fresh(), [{ group: "a", text: "Only." }]);
    expect(b.note).toBe("Only.");
  });
});

describe("accounting for a file's settings", () => {
  const skipped = [
    { key: "a", label: "A", reason: "own-way" as const },
    { key: "a", label: "A again", reason: "bad-value" as const },
    { key: "unrecognised", label: "3 settings", reason: "unrecognised" as const, count: 3 },
  ];

  it("counts each listed key once, and a summary as its settings", () => {
    expect(notImportedCount(skipped)).toBe(4);
    expect(notImportedCount([])).toBe(0);
  });

  it("adds up to the file's settings, a key read and listed counting as listed", () => {
    const keys = ["a", "b", "c", "d", "x1", "x2", "x3"];
    const tally = tallySettings(keys, new Set(["a", "b", "colours"]), skipped, keys.length);
    expect(tally).toEqual({ used: 1, listed: 4, rest: 2 });
    expect(tally.used + tally.listed + tally.rest).toBe(keys.length);
    expect(tallySettings([], new Set(), skipped, 2).rest).toBe(0);
  });
});
