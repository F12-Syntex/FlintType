import { describe, expect, it } from "vitest";
import type { ImportPlan } from "@/types/settings-import";
import { identify } from "./detect";
import sample from "./fixtures/monkeytype-settings.json";
import { FT_EXPORT_VERSION, planFlinttype } from "./flinttype";
import { FT_FIELDS } from "./ft-fields";
import { planMonkeytype } from "./monkeytype";
import { MAX_IMPORT_BYTES, textBytes } from "./read";
import { readCurrentSettings } from "./slices";

/** Whatever a file holds, the text the review shows from it stays short:
 *  a hostile or corrupt file can't fill the dialog with one value. */

const HUGE = "Q".repeat(200_000);

function plan(text: string, source: "monkeytype" | "flinttype" = "monkeytype"): ImportPlan {
  expect(textBytes(text)).toBeLessThan(MAX_IMPORT_BYTES);
  const id = identify(text, source);
  if (!id.ok) throw new Error(`not identified: ${id.failure.kind}`);
  const current = readCurrentSettings(null);
  return id.source === "monkeytype"
    ? planMonkeytype(id.payload, current, "x.json")
    : planFlinttype(id.slices, current, { fileLabel: "x.json", settingsInFile: id.settingsInFile }, [{ id: "all", name: "All" }], () => "all");
}

function expectBounded(p: ImportPlan, where: string) {
  for (const g of p.groups) {
    expect([where, g.id, (g.note ?? "").length <= 400]).toEqual([where, g.id, true]);
    for (const i of [...g.items, ...g.unchanged]) {
      const lengths = [i.label, i.to, i.now, i.origin ?? "", i.swatch ?? "", i.nowSwatch ?? ""].map((t) => t.length);
      expect([where, i.id, Math.max(...lengths) <= 200]).toEqual([where, i.id, true]);
    }
  }
  for (const s of p.skipped) {
    const lengths = [s.label.length, (s.value ?? "").length, (s.note ?? "").length];
    expect([where, s.key, lengths[0] <= 80 && lengths[1] <= 80 && lengths[2] <= 200]).toEqual([where, s.key, true]);
  }
  expect(p.skipped.length).toBeLessThan(80);
}

describe("a hostile MonkeyType file", () => {
  it("keeps every shown text short, whichever setting holds a huge string", () => {
    for (const key of Object.keys(sample)) {
      expectBounded(plan(JSON.stringify({ ...sample, [key]: HUGE })), key);
      expectBounded(plan(JSON.stringify({ ...sample, [key]: [HUGE, HUGE.slice(0, 1000)] })), `${key} list`);
    }
  });

  it("keeps an unknown font's note short", () => {
    const p = plan(JSON.stringify({ ...sample, fontFamily: "Q".repeat(900_000) }));
    const font = p.skipped.find((s) => s.key === "fontFamily");
    expect(font?.note).toBe("This font isn't included.");
    expect(font?.value?.length).toBeLessThanOrEqual(60);
  });

  it("keeps a custom theme of huge strings short", () => {
    expectBounded(plan(JSON.stringify({ ...sample, customThemeColors: Array(10).fill(HUGE.slice(0, 50_000)) })), "colours");
  });
});

describe("a hostile flinttype file", () => {
  const file = (slices: Record<string, unknown>) =>
    JSON.stringify({ app: "flinttype", version: FT_EXPORT_VERSION, exportedAt: "2026-10-31T00:00:00.000Z", slices });

  it("keeps every shown text short, whichever field holds a huge string", () => {
    for (const [slice, fields] of Object.entries(FT_FIELDS)) {
      const data = Object.fromEntries(Object.keys(fields).map((f) => [f, HUGE.slice(0, 10_000)]));
      expectBounded(plan(file({ [slice]: data }), "flinttype"), slice);
    }
    const theme = { "--primary": HUGE, "--background": HUGE };
    expectBounded(plan(file({ theme, palette: { activeId: HUGE } }), "flinttype"), "theme");
    expectBounded(plan(file({ [HUGE]: { [HUGE.slice(0, 1000)]: 1 } }), "flinttype"), "unknown");
  });
});
