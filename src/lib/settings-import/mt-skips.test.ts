import { describe, expect, it } from "vitest";
import { initialState, reducer, type State } from "@/app/_components/practice-reducer";
import { MT_KNOWN_KEYS, mtSkipped, SKIPS } from "./mt-skips";

/** Type `keys` into a words test of `words` with the real reducer. */
function typeWords(words: string[], keys: string): State {
  let s: State = { ...initialState, mode: "WORDS", words, phase: "rest" };
  let now = 0;
  for (const c of keys) {
    now += 100;
    s = c === " "
      ? reducer(s, { type: "SPACE", now, strictSpace: false })
      : reducer(s, { type: "TYPE_CHAR", char: c, now, stopOnError: false, allowExtras: true });
  }
  return s;
}

describe("mtSkipped", () => {
  it("lists a setting only when the file changes it from MonkeyType's default", () => {
    expect(mtSkipped({ freedomMode: false, funbox: [], minWpm: "off" }, new Set(), null)).toEqual([]);
    const changed = mtSkipped({ freedomMode: true, funbox: ["mirror"] }, new Set(), null);
    expect(changed.map((s) => [s.key, s.reason])).toEqual([["freedomMode", "own-way"], ["funbox", "not-in-flinttype"]]);
  });

  it("never lists MonkeyType's account-only settings", () => {
    expect(mtSkipped({ ads: "on", resultSaving: false, favThemes: ["nord"], monkey: true }, new Set(), null)).toEqual([]);
  });

  it("leaves out keys a mapper used", () => {
    expect(mtSkipped({ strictSpace: true }, new Set(["strictSpace"]), null)).toEqual([]);
  });

  it("names MonkeyType's strict space so it can't be mistaken for flinttype's", () => {
    const [s] = mtSkipped({ strictSpace: true }, new Set(), null);
    expect(s).toMatchObject({ label: "MonkeyType's strict space", note: "Here, Strict space is set from your Stop on error setting instead." });
  });

  it("says how a test really ends, in place of Quick end", () => {
    expect(SKIPS.quickEnd.note).toBe("The test ends when you type the last letter of the last word right. Otherwise press space.");
    // The last letter typed right ends it, even after a wrong letter earlier in the word.
    expect(typeWords(["hi", "hello"], "hi jello").phase).toBe("done");
    // A wrong last letter doesn't; space does.
    expect(typeWords(["hi", "hello"], "hi hellp").phase).toBe("running");
    expect(typeWords(["hi", "hello"], "hi hellp ").phase).toBe("done");
  });

  it("collapses settings it doesn't know into one line", () => {
    const out = mtSkipped({ futureSetting: 1, nested: { a: 1 }, freedomMode: true }, new Set(), null);
    expect(out.at(-1)).toMatchObject({ key: "unrecognised", label: "2 settings", reason: "unrecognised", count: 2 });
    expect(mtSkipped({ futureSetting: 1 }, new Set(), null)[0]).toMatchObject({ label: "1 setting", count: 1 });
  });

  it("treats names from Object.prototype as unknown settings", () => {
    const out = mtSkipped({ toString: 1, constructor: "x", hasOwnProperty: 2 }, new Set(), null);
    expect(out).toEqual([expect.objectContaining({ key: "unrecognised", count: 3 })]);
    expect(MT_KNOWN_KEYS.has("constructor")).toBe(false);
  });

  it("lists a named theme, but not MonkeyType's default one", () => {
    expect(mtSkipped({ theme: "nord" }, new Set(), null)[0]).toMatchObject({ key: "theme", value: "Nord" });
    expect(mtSkipped({ theme: "serika_dark" }, new Set(), null)).toEqual([]);
  });

  it("leaves the named theme out while the custom theme is on", () => {
    // MonkeyType ignores it then; a custom theme that can't be read is
    // already listed once, as the custom theme.
    expect(mtSkipped({ customTheme: true, theme: "shadow" }, new Set(), null)).toEqual([]);
    expect(mtSkipped({ customTheme: false, theme: "shadow" }, new Set(), null)[0]).toMatchObject({ key: "theme" });
  });
});
