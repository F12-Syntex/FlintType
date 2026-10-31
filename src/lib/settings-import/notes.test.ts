import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { ImportPlan } from "@/types/settings-import";
import { identify } from "./detect";
import sample from "./fixtures/monkeytype-settings.json";
import { FT_EXPORT_VERSION, planFlinttype } from "./flinttype";
import { planMonkeytype } from "./monkeytype";
import { SKIPS } from "./mt-skips";
import { readCurrentSettings } from "./slices";

/** Every note a review can show, for a skipped setting or a group,
 *  keeps the copy rules (ui-law §27 rule 6), sentence by sentence. */

/** A value other than MonkeyType's default `d`, so the key is listed. */
function offDefault(d: unknown): unknown {
  if (typeof d === "boolean") return !d;
  if (typeof d === "number") return d + 1;
  if (Array.isArray(d)) return [...d, "x"];
  return `${String(d)}x`;
}

const current = { ...readCurrentSettings(null), uploadedImage: true };

function plan(payload: Record<string, unknown>, source: "monkeytype" | "flinttype" = "monkeytype"): ImportPlan {
  const id = identify(JSON.stringify(payload), source);
  if (!id.ok) throw new Error(`not identified: ${id.failure.kind}`);
  return id.source === "monkeytype"
    ? planMonkeytype(id.payload, current, null)
    : planFlinttype(id.slices, current, { fileLabel: null, settingsInFile: id.settingsInFile }, [{ id: "all", name: "All" }], () => "all");
}

const notes = (p: ImportPlan): [string, string][] => [
  ...p.skipped.flatMap((s): [string, string][] => (s.note ? [[`skip ${s.key}`, s.note]] : [])),
  ...p.groups.flatMap((g): [string, string][] => (g.note ? [[`group ${g.id}`, g.note]] : [])),
];

describe("every note in a review", () => {
  it("passes the copy rules", () => {
    const everySkip = Object.fromEntries(Object.entries(SKIPS).map(([k, s]) => [k, offDefault(s.default)]));
    const background = { customBackground: "https://x.com/a.png", customBackgroundFilter: [0, 1, 0.5, 1] };
    const plans = [
      plan({ ...sample, ...everySkip, ...background, mode: "quote", quoteLength: [0, 2], fontFamily: "Comic_Sans", newKey: 1 }),
      plan({ ...sample, customTheme: false, theme: "dracula", mode: "quote", quoteLength: [-3], future1: 1, future2: 2 }),
      plan({ ...sample, mode: "time", time: 0, caretStyle: 5, customBackground: "javascript:x", keymapMode: {} }),
      plan({ ...sample, customThemeColors: ["#zz"] }),
      plan({ app: "flinttype", version: FT_EXPORT_VERSION, slices: { caret: { style: 5, width: 2 }, odd: { a: 1 } } }, "flinttype"),
      plan({ app: "flinttype", version: FT_EXPORT_VERSION, slices: { theme: { "--primary": "red;" }, a: {}, b: {} } }, "flinttype"),
    ];
    const all = plans.flatMap(notes);
    // Every kind is here: skip notes, both singular and plural unknown
    // notes, and the group notes (colours, background, test setup).
    expect(all.length).toBeGreaterThan(40);
    for (const id of ["skip strictSpace", "group colours", "group background", "group test"]) {
      expect(all.map(([where]) => where)).toContain(id);
    }
    for (const [where, note] of all) {
      for (const sentence of note.split(/(?<=[.?]) /)) expect([where, sentence, bannedPatterns(sentence)]).toEqual([where, sentence, []]);
    }
  });
});
