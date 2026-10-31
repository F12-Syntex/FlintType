import { describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE } from "@/lib/appearance-prefs";
import { DEFAULT_AUDIO } from "@/lib/audio-prefs";
import { DEFAULT_BACKGROUND } from "@/lib/background-prefs";
import { DEFAULT_BEHAVIOUR } from "@/lib/behaviour-prefs";
import { DEFAULT_CARET } from "@/lib/caret-settings";
import { planMonkeytypeImport } from "./plan";
import { MtImportError } from "./read-file";
import type { MtPlan, MtSettings } from "./types";

const DEFAULTS: MtSettings = {
  caret: DEFAULT_CARET,
  appearance: DEFAULT_APPEARANCE,
  behaviour: DEFAULT_BEHAVIOUR,
  background: DEFAULT_BACKGROUND,
  audio: DEFAULT_AUDIO,
  practice: { mode: "WORDS", length: 25, wordlist: "english" },
};

function with_(patch: { [S in keyof MtSettings]?: Partial<MtSettings[S]> }): MtSettings {
  const out = { ...DEFAULTS } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    out[k] = { ...(DEFAULTS as Record<string, object>)[k], ...v };
  }
  return out as MtSettings;
}

/** "Label: value" for every review row, by group title. */
function rows(plan: MtPlan): Record<string, string[]> {
  return Object.fromEntries(
    plan.groups.map((g) => [g.title, g.rows.map((r) => `${r.label}: ${r.value}`)]),
  );
}

/** A real MonkeyType export (the one attached to the bug report). */
const EXPORT = {
  theme: "shadow", themeLight: "serika", themeDark: "serika_dark", autoSwitchTheme: false,
  customTheme: true, customThemeColors: ["#132237", "#ebb723"], favThemes: [], showKeyTips: true,
  smoothCaret: "medium", codeUnindentOnBackspace: false, quickRestart: "tab", punctuation: false,
  numbers: false, words: 25, time: 15, mode: "time", quoteLength: [0, 1, 2, 3], language: "english",
  fontSize: 3, freedomMode: true, difficulty: "normal", blindMode: false, quickEnd: true,
  caretStyle: "default", paceCaretStyle: "default", flipTestColors: false, layout: "default",
  funbox: [], confidenceMode: "off", indicateTypos: "below", compositionDisplay: "replace",
  timerStyle: "mini", liveSpeedStyle: "mini", liveAccStyle: "off", liveBurstStyle: "off",
  colorfulMode: false, randomTheme: "off", timerColor: "main", timerOpacity: "1", stopOnError: "off",
  deleteOnError: "off", showAllLines: false, keymapMode: "next", keymapStyle: "staggered",
  keymapLegendStyle: "lowercase", keymapLayout: "qwerty", keymapKeys: "minimal", keymapSize: 1.1,
  fontFamily: "Roboto_Mono", smoothLineScroll: true, alwaysShowDecimalPlaces: false,
  playSoundOnClick: "off", soundVolume: 0.5, startGraphsAtZero: true, highlightMode: "letter",
  typedEffect: "keep", typingSpeedUnit: "wpm", strictSpace: true, customBackground: "",
  customBackgroundSize: "cover", customBackgroundFilter: [0, 1, 1, 0.8], tapeMode: "off",
  tapeMargin: 50, maxLineWidth: 0,
};

describe("planMonkeytypeImport", () => {
  it("lists exactly what the attached export changes from the defaults", () => {
    const plan = planMonkeytypeImport(EXPORT, DEFAULTS);
    expect(rows(plan)).toEqual({
      "Your test": ["Test: 15 seconds"],
      Typing: [
        "Caret movement: Smooth",
        "Highlight: Letter",
        "Lines shown: 3",
        "Line width: Full",
      ],
      Keyboard: ["Show keyboard: Next", "Size: 1.1×", "Letters only: On"],
      "Stats & results": ["Accuracy: Off", "Burst: Off"],
      Behaviour: ["Strict space: On"],
    });
    expect(plan.changes).toBe(11);
    expect(plan.leavesLook).toBe(true);
    // No background image in the file: the background group stays out.
    expect(plan.groups.find((g) => g.id === "background")).toBeUndefined();
  });

  it("drops settings that already match, and counts them", () => {
    const now = with_({ appearance: { highlightMode: "letter" } });
    const plan = planMonkeytypeImport(EXPORT, now);
    expect(rows(plan).Typing).not.toContain("Highlight: Letter");
    expect(plan.changes).toBe(10);
    expect(plan.alreadyMatch).toBe(planMonkeytypeImport(EXPORT, DEFAULTS).alreadyMatch + 1);
  });

  it("writes only the fields it lists", () => {
    const plan = planMonkeytypeImport(EXPORT, DEFAULTS);
    const keyboard = plan.groups.find((g) => g.id === "keyboard");
    expect(keyboard?.patches).toEqual({
      appearance: { keymap: "next", keymapSize: 1.1, keymapCompact: true },
    });
    const test = plan.groups.find((g) => g.id === "test");
    expect(test?.patches).toEqual({ practice: { mode: "TIME", length: 15 } });
  });

  it("counts keys flinttype has no setting for, leaving the theme and font out of it", () => {
    const plan = planMonkeytypeImport(
      { caretStyle: "block", theme: "shadow", fontFamily: "x", funbox: [], lazyMode: false },
      DEFAULTS,
    );
    expect(plan.unmatched).toBe(2);
  });

  it("lands each MonkeyType caret speed on its own Movement preset", () => {
    const speed = (v: unknown) =>
      planMonkeytypeImport({ smoothCaret: v }, with_({ caret: { smoothSpeed: 450 } }))
        .groups[0]?.patches.caret?.smoothSpeed;
    expect([speed("off"), speed("fast"), speed("medium"), speed("slow")]).toEqual([0, 60, 120, 200]);
    expect(speed(true)).toBe(120);
  });

  it("reads MonkeyType's current enum spellings", () => {
    const plan = planMonkeytypeImport(
      {
        highlightMode: "next_two_words",
        timerStyle: "flash_mini",
        timerOpacity: "0.5",
        keymapKeys: "full",
        keymapStyle: "split_matrix",
      },
      with_({ appearance: { keymapCompact: true } }),
    );
    expect(plan.groups.flatMap((g) => g.rows.map((r) => `${r.label}: ${r.value}`))).toEqual([
      "Highlight: Next word",
      "Key arrangement: Split",
      "Number row: Always",
      "Letters only: Off",
      "Timer: Flash",
      "Live stats opacity: 50%",
    ]);
  });

  it("still reads keymapShowTopRow from older exports", () => {
    const plan = planMonkeytypeImport({ keymapShowTopRow: "never" }, DEFAULTS);
    expect(rows(plan).Keyboard).toEqual(["Number row: Never"]);
  });

  it("follows MonkeyType's typing layout when the keyboard is synced to it", () => {
    const layout = (mt: Record<string, unknown>) =>
      planMonkeytypeImport(mt, DEFAULTS).groups[0]?.patches.appearance?.keymapLayout;
    expect(layout({ keymapLayout: "overrideSync", layout: "dvorak" })).toBe("dvorak");
    expect(layout({ keymapLayout: "colemak" })).toBe("colemak");
    // A layout the keyboard can't draw stays as it is.
    expect(() => planMonkeytypeImport({ keymapLayout: "workman" }, DEFAULTS)).toThrow(MtImportError);
  });

  it("hides rows whose master setting is off, as the settings pages do", () => {
    const plan = planMonkeytypeImport(
      { keymapMode: "off", keymapSize: 2, tapeMode: "off", tapeMargin: 20, playSoundOnClick: "off", soundVolume: 1 },
      with_({ appearance: { keymap: "next" } }),
    );
    expect(plan.groups.flatMap((g) => g.rows.map((r) => r.label))).toEqual(["Show keyboard"]);
  });

  it("brings key clicks and their volume over together", () => {
    const plan = planMonkeytypeImport({ playSoundOnClick: "3", soundVolume: "0.1" }, DEFAULTS);
    expect(rows(plan).Behaviour).toEqual(["Key clicks: On", "Click volume: 10%"]);
  });

  it("maps a background image with MonkeyType's filter", () => {
    const plan = planMonkeytypeImport(
      {
        customBackground: "https://example.com/bg.jpg",
        customBackgroundSize: "max",
        customBackgroundFilter: [4, 0.7, 1, 0.85],
      },
      DEFAULTS,
    );
    expect(plan.groups[0]?.patches.background).toEqual({
      imageUrl: "https://example.com/bg.jpg",
      opacity: 0.85,
      blur: 4,
      darken: 0.3,
    });
  });

  it("takes quote sizes from quoteLength, never from words", () => {
    const test = (mt: Record<string, unknown>) =>
      planMonkeytypeImport(mt, DEFAULTS).groups[0]?.rows[0]?.value;
    expect(test({ mode: "quote", words: 50, quoteLength: [2, 1] })).toBe("Medium quote");
    expect(test({ mode: "quote", words: 50, quoteLength: [-1] })).toBe("Short quote");
    expect(test({ mode: "words", words: 50 })).toBe("50 words");
  });

  it("skips MonkeyType's endless tests and zen mode", () => {
    expect(() => planMonkeytypeImport({ mode: "time", time: 0 }, DEFAULTS)).toThrow(MtImportError);
    expect(() => planMonkeytypeImport({ mode: "zen" }, DEFAULTS)).toThrow(MtImportError);
  });

  it("sets the word list only to one flinttype has", () => {
    expect(rows(planMonkeytypeImport({ language: "german_1k" }, DEFAULTS))["Your test"]).toEqual([
      "Word list: German 1K",
    ]);
    expect(() => planMonkeytypeImport({ language: "not_a_language" }, DEFAULTS)).toThrow(MtImportError);
  });

  it("turns numbers and punctuation on when either is on", () => {
    const plan = planMonkeytypeImport({ punctuation: false, numbers: true }, DEFAULTS);
    expect(rows(plan)["Your test"]).toEqual(["Numbers and punctuation: On"]);
  });

  it("refuses a file with nothing it understands", () => {
    try {
      planMonkeytypeImport({ hello: "world" }, DEFAULTS);
      expect.unreachable();
    } catch (err) {
      expect((err as MtImportError).kind).toBe("unrecognised");
    }
  });
});
