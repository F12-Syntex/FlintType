import { describe, expect, it } from "vitest";
import type { AppearancePrefs } from "@/lib/appearance-prefs";
import {
  APPEARANCE_SECTION_FIELDS,
  changedAppearanceSections,
} from "./section-fields";

/** The pure helper only reads the keys named in the field map, so a
 *  partial cast is a sufficient fixture — undefined === undefined reads
 *  as "unchanged" for every untouched key. */
function prefs(partial: Partial<AppearancePrefs>): AppearancePrefs {
  return partial as AppearancePrefs;
}

describe("changedAppearanceSections", () => {
  it("reports nothing changed for identical slices", () => {
    expect(changedAppearanceSections(prefs({}), prefs({})).size).toBe(0);
  });

  it("attributes a borders change to geometry only", () => {
    const changed = changedAppearanceSections(
      prefs({ borders: "soft" }),
      prefs({ borders: "default" }),
    );
    expect(changed.has("geometry")).toBe(true);
    expect(changed.size).toBe(1);
  });

  it("attributes a mistake-style change to mistakes only", () => {
    const changed = changedAppearanceSections(
      prefs({ mistakeStyle: "underline" }),
      prefs({ mistakeStyle: "bold" }),
    );
    expect(changed.has("mistakes")).toBe(true);
    expect(changed.size).toBe(1);
  });

  it("tracks several independent section changes at once", () => {
    const changed = changedAppearanceSections(
      prefs({ borders: "soft", keymap: "off", tapeMode: "word" }),
      prefs({ borders: "default", keymap: "react", tapeMode: "off" }),
    );
    expect([...changed].sort()).toEqual(["geometry", "keymap", "tape"]);
  });

  it("detects a change in the first field of every mapped section", () => {
    for (const [section, fields] of Object.entries(
      APPEARANCE_SECTION_FIELDS,
    )) {
      const first = fields[0];
      const changed = changedAppearanceSections(
        prefs({ [first]: "__changed__" } as Partial<AppearancePrefs>),
        prefs({}),
      );
      expect(changed.has(section)).toBe(true);
    }
  });

  it("maps each appearance key to exactly one section", () => {
    const seen = new Set<string>();
    for (const fields of Object.values(APPEARANCE_SECTION_FIELDS)) {
      for (const field of fields) {
        expect(seen.has(field)).toBe(false);
        seen.add(field);
      }
    }
  });
});
