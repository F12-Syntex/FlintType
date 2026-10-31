import { describe, expect, it } from "vitest";
import type { CurrentSettings } from "@/types/settings-import";
import sample from "./fixtures/monkeytype-settings.json";
import { collectMonkeytype, planMonkeytype } from "./monkeytype";
import { migrateLegacy } from "./mt-legacy";
import { changeCount, notImportedCount, unchangedCount } from "./plan";
import { readCurrentSettings } from "./slices";

// With no prefs loaded, readCurrentSettings returns every slice's defaults.
const fresh = (): CurrentSettings => readCurrentSettings(null);

const plan = (mt: Record<string, unknown>, cur = fresh()) => planMonkeytype(mt, cur, null);

describe("planMonkeytype on a real MonkeyType export", () => {
  const p = planMonkeytype(sample, fresh(), "sample-settings.json");

  it("lists the groups in settings order", () => {
    expect(p.groups.map((g) => g.name)).toEqual([
      "Colours", "Font", "Caret", "Typing area", "On-screen keyboard",
      "Live stats", "Result screen", "Input", "Sound", "Test setup",
    ]);
    expect(p.settingsInFile).toBe(94);
    expect(p.fileLabel).toBe("sample-settings.json");
  });

  it("counts only the settings that change", () => {
    expect(changeCount(p.groups)).toBe(33);
    expect(unchangedCount(p.groups)).toBe(23);
    expect(changeCount(p.groups, new Set(["font", "caret"]))).toBe(3);
  });

  it("accounts for every setting in the file once", () => {
    // 40 set the 56 rows, 7 are listed, 47 are at MonkeyType's defaults
    // or change nothing here (words 25 in a time test, a filter with no
    // image, the volume with clicks off).
    expect(p.tally).toEqual({ used: 40, listed: 7, rest: 47 });
    expect(p.tally!.used + p.tally!.listed + p.tally!.rest).toBe(p.settingsInFile);
    expect(notImportedCount(p.skipped)).toBe(p.tally!.listed);
    // The not-imported count is exactly the rows listed.
    expect(p.skipped).toHaveLength(p.tally!.listed);
  });

  it("says a custom theme colour with no slot in the Colours note, not the not-imported list", () => {
    const colours = p.groups.find((g) => g.id === "colours")!;
    expect(colours.note).toBe(
      "Your palette changes to Custom, made from these colours. Extra letters use your wrong-letter colour, so #791717 isn't used.",
    );
    expect(p.skipped.some((s) => s.key.startsWith("customThemeColors"))).toBe(false);
  });

  it("adds up for an old file and a file with unknown settings", () => {
    for (const file of [
      { ...sample, quickTab: true, showLiveWpm: true, liveSpeedStyle: "text", newThing: 1, otherThing: "x" },
      { customTheme: true, mode: "words", words: 0 },
    ]) {
      const t = plan(file).tally!;
      expect(t.used + t.listed + t.rest).toBe(Object.keys(file).length);
    }
  });

  it("maps the changed settings to flinttype's values and labels", () => {
    const changed = Object.fromEntries(
      p.groups.flatMap((g) => g.items).map((i) => [i.id, [i.label, i.now, i.to, i.value, i.origin]]),
    );
    expect(changed).toMatchObject({
      "theme.--background": ["Background", "Palette's own", "#132237", "#132237", "From Background"],
      "theme.--primary": ["Accent", "Palette's own", "#ebb723", "#ebb723", "From Main"],
      "theme.--ft-passage-untyped": ["Letters to type", "Palette's own", "#0b4c6c", "#0b4c6c", "From Sub"],
      "theme.--muted-foreground": ["Quiet text", "Palette's own", "#179999", "#179999", "From Sub, adjusted for contrast"],
      mode: ["Mode", "System", "Dark", "dark", "From a dark background"],
      "theme.--ft-font-family": ["Typeface", "Default", "Roboto Mono", '"Roboto Mono", ui-monospace, monospace', "From Roboto Mono"],
      "theme.--ft-font-scale": ["Size", "40px", "48px", "1.2", "From size 3"],
      "caret.smoothSpeed": ["Movement", "Drift", "Smooth", 120, "From Medium"],
      "appearance.highlightMode": ["Highlight", "Off", "Letter", "letter", "From Letter"],
      "appearance.linesRendered": ["Lines shown", "4", "3", 3, "With Show all lines off"],
      "appearance.maxLineWidth": ["Line width", "80 ch", "Full", 0, "From Full"],
      "appearance.keymap": ["Show keyboard", "React", "Next", "next", "From Next"],
      "appearance.keymapCompact": ["Letters only", "Off", "On", true, "From Minimal"],
      "appearance.keymapSize": ["Size", "0.8×", "1.1×", 1.1, "From 1.1×"],
      "appearance.liveAccuracyStyle": ["Accuracy", "Mini", "Off", "off", "From Off"],
      "appearance.resultShowHeatmap": ["Text heatmap", "Off", "On", true, "From On"],
      "practice.mode": ["Mode", "Words", "Time", "TIME", "From Time"],
      "practice.length": ["Length", "25 words", "15 seconds", 15, "From 15 seconds"],
    });
    expect(Object.keys(changed)).toHaveLength(33);
  });

  it("shows a different value now and after the import for every change", () => {
    for (const i of p.groups.flatMap((g) => g.items)) expect([i.id, i.now !== i.to]).toEqual([i.id, true]);
  });

  it("never names a skipped setting like a listed one", () => {
    const listed = new Set(p.groups.flatMap((g) => [...g.items, ...g.unchanged]).map((i) => i.label));
    expect(p.skipped.filter((s) => listed.has(s.label))).toEqual([]);
  });

  it("keeps settings already at the same value out of the count", () => {
    const same = p.groups.flatMap((g) => g.unchanged).map((i) => i.id);
    expect(same).toEqual(expect.arrayContaining([
      "caret.style", "appearance.typedEffect", "appearance.keymapLayout",
      "behaviour.stopOnError", "behaviour.strictSpace", "practice.wordlist",
    ]));
  });

  it("lists what isn't imported, the user's own choices only", () => {
    expect(p.skipped.map((s) => s.key)).toEqual([
      "quickRestart", "freedomMode", "quickEnd",
      "indicateTypos", "singleListCommandLine", "strictSpace", "oppositeShiftMode",
    ]);
    // Defaults like funbox [] and the account-only keys stay out.
    expect(p.skipped.some((s) => s.key === "ads" || s.key === "funbox")).toBe(false);
    // Every key of the real file is one this version knows.
    expect(p.skipped.some((s) => s.reason === "unrecognised")).toBe(false);
  });

  it("writes no background, since the file has no image", () => {
    expect(p.groups.some((g) => g.id === "background")).toBe(false);
  });
});

describe("planMonkeytype themes", () => {
  it("uses the custom colours only while the custom theme is on", () => {
    const named = plan({ customTheme: false, customThemeColors: sample.customThemeColors, theme: "nord" });
    expect(named.groups.some((g) => g.id === "colours")).toBe(false);
    expect(named.skipped.find((s) => s.key === "theme")).toMatchObject({ value: "Nord", reason: "not-in-flinttype" });
  });

  it("doesn't list MonkeyType's default named theme", () => {
    expect(plan({ customTheme: false, theme: "serika_dark", mode: "time" }).skipped).toEqual([]);
  });

  it("reports a custom theme whose colours can't be read", () => {
    const p = plan({ customTheme: true, customThemeColors: ["#123", "nope"], theme: "shadow" });
    expect(p.groups.some((g) => g.id === "colours")).toBe(false);
    expect(p.skipped[0]).toMatchObject({ key: "customTheme", label: "Custom theme", reason: "bad-value" });
    expect(p.skipped.some((s) => s.key === "theme")).toBe(false);
    // Listed once, as a setting the file has, whether or not it has the colours.
    expect(plan({ customTheme: true, mode: "time" }).tally).toEqual({ used: 1, listed: 1, rest: 0 });
  });

  it("matches colours the user already has", () => {
    const cur = fresh();
    cur.theme = { "--background": "#132237", "--primary": "#EBB723" };
    const p = plan({ customTheme: true, customThemeColors: sample.customThemeColors }, cur);
    const colours = p.groups.find((g) => g.id === "colours");
    expect(colours?.unchanged.map((i) => i.id)).toEqual(["theme.--background", "theme.--primary"]);
  });
});

describe("the settings a MonkeyType file counts as used", () => {
  /** The file's keys that count as used, as the tally counts them. */
  const usedKeys = (file: Record<string, unknown>, cur = fresh()) => {
    const payload = migrateLegacy(file);
    const { col } = collectMonkeytype(payload, cur);
    const listed = new Set(planMonkeytype(file, cur, null).skipped.map((s) => s.key));
    return Object.keys(payload).filter((k) => col.used.has(k) && !listed.has(k));
  };
  /** Everything the review would show a row for, changed or not. */
  const rows = (file: Record<string, unknown>, cur = fresh()) =>
    JSON.stringify(collectMonkeytype(migrateLegacy(file), cur).col.out);
  /** The key at another value: a flipped switch, else one nothing reads. */
  const altered = (file: Record<string, unknown>, key: string) => ({
    ...file,
    [key]: typeof file[key] === "boolean" ? !file[key] : { unusable: true },
  });

  const named = { ...sample, customTheme: false, flipTestColors: true };

  it("never counts a key that sets nothing", () => {
    for (const file of [sample, named]) {
      for (const key of usedKeys(file)) {
        // Each one sets a row: changing it changes the rows.
        expect([key, rows(altered(file, key)) !== rows(file)]).toEqual([key, true]);
      }
    }
  });

  it("leaves out the lengths, image settings and volume the file doesn't use", () => {
    const used = new Set(usedKeys(sample));
    for (const key of ["words", "quoteLength", "customBackground", "customBackgroundSize", "customBackgroundFilter", "soundVolume"]) {
      expect([key, used.has(key)]).toEqual([key, false]);
    }
    expect(used.has("time")).toBe(true);
    expect(used.size).toBe(planMonkeytype(sample, fresh(), null).tally!.used);
  });

  it("leaves out the custom theme's keys while a named theme is on", () => {
    const used = new Set(usedKeys(named));
    for (const key of ["customTheme", "customThemeColors", "flipTestColors", "colorfulMode"]) {
      expect([key, used.has(key)]).toEqual([key, false]);
    }
    const t = planMonkeytype(named, fresh(), null).tally!;
    expect(t).toEqual({ used: 36, listed: 8, rest: 50 });
    expect(t.used + t.listed + t.rest).toBe(Object.keys(named).length);
  });
});
