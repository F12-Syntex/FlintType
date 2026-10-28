import { describe, expect, it } from "vitest";
import { DEFAULT_KEYBOARD } from "../keyboard-settings";
import type { ThemeOverrides } from "../theme-customization";
import {
  baselinePaletteId,
  countVarsOffBaseline,
  overridesMatchBaseline,
  paletteAfterRestore,
  paletteBaseline,
  palettePresetSlices,
  paletteSliceFor,
  paletteSwitchDecision,
  restoreVarsToBaseline,
  switchDiscardsChanges,
} from "./palette-baseline";
import { findTheme } from "./registry";

const CUSTOM = "custom";
const catppuccin = findTheme("catppuccin");
const cyberpunk = findTheme("cyberpunk");

describe("palettePresetSlices / paletteBaseline", () => {
  it("is the bare defaults for Default, reactive and unknown palettes", () => {
    for (const t of [undefined, findTheme("background-reactive"), findTheme("nope")]) {
      expect(paletteBaseline(t)).toEqual({
        keyboard: DEFAULT_KEYBOARD,
        themeOverrides: {},
      });
      expect(palettePresetSlices(t)).toEqual({ themeOverrides: {} });
    }
  });

  it("overlays a palette's keyboard and theme presets on the defaults", () => {
    const b = paletteBaseline(cyberpunk);
    expect(b.keyboard).toEqual({
      ...DEFAULT_KEYBOARD,
      design: "outline",
      shape: "square",
    });
    expect(b.themeOverrides).toEqual({
      "--ft-font-scale": "1.1",
      "--radius": "0rem",
    });
  });

  it("drops preset values that only restate the :root default", () => {
    // Catppuccin's preset carries --ft-word-spacing: 0.25em (which the
    // theme migration strips on the next load) and --ft-font-scale: 1.0
    // (100%, which the Size control stores as no override at all).
    expect(catppuccin?.presets?.themeOverrides).toEqual({
      "--ft-font-scale": "1.0",
      "--ft-word-spacing": "0.25em",
    });
    expect(palettePresetSlices(catppuccin).themeOverrides).toEqual({});
  });

  it("never applies a preset's caret or appearance fields", () => {
    const slices = palettePresetSlices(cyberpunk) as Record<string, unknown>;
    expect(Object.keys(slices).sort()).toEqual(["keyboard", "themeOverrides"]);
  });

  it("returns copies, so writing a slice can't mutate the preset", () => {
    const a = palettePresetSlices(cyberpunk);
    a.themeOverrides["--radius"] = "9rem";
    if (a.keyboard) a.keyboard.design = "glass";
    expect(paletteBaseline(cyberpunk).themeOverrides["--radius"]).toBe("0rem");
    expect(paletteBaseline(cyberpunk).keyboard.design).toBe("outline");
  });
});

describe("baselinePaletteId", () => {
  it("is the active palette, or the palette a custom fork came off", () => {
    expect(baselinePaletteId({ activeId: null }, CUSTOM)).toBeNull();
    expect(baselinePaletteId({ activeId: "cyberpunk" }, CUSTOM)).toBe("cyberpunk");
    expect(
      baselinePaletteId(
        { activeId: CUSTOM, base: { id: "catppuccin", light: {}, dark: {} } },
        CUSTOM,
      ),
    ).toBe("catppuccin");
    expect(baselinePaletteId({ activeId: CUSTOM }, CUSTOM)).toBeNull();
    // A fork off Background reactive measures against Reactive.
    expect(
      baselinePaletteId(
        {
          activeId: CUSTOM,
          base: { id: "background-reactive", light: {}, dark: {} },
        },
        CUSTOM,
      ),
    ).toBe("background-reactive");
  });
});

describe("paletteSliceFor", () => {
  it("persists a named palette's vars with the -- prefix", () => {
    const s = paletteSliceFor("cyberpunk");
    expect(s.activeId).toBe("cyberpunk");
    expect(s.varsLight?.["--primary"]).toBe(cyberpunk?.cssVars.light.primary);
    expect(s.varsDark?.["--background"]).toBe(cyberpunk?.cssVars.dark.background);
  });

  it("keeps Default and synthetic ids bare", () => {
    expect(paletteSliceFor(null)).toEqual({ activeId: null });
    expect(paletteSliceFor("background-reactive")).toEqual({
      activeId: "background-reactive",
    });
  });
});

describe("countVarsOffBaseline", () => {
  const base: ThemeOverrides = { "--ft-font-scale": "1.1", "--radius": "0rem" };

  it("counts nothing right after a pick", () => {
    expect(countVarsOffBaseline(base, base, ["--ft-font-scale", "--radius"])).toBe(0);
  });

  it("counts a changed value, a cleared palette value and a new override", () => {
    const o: ThemeOverrides = { "--ft-font-scale": "1.3", "--ft-word-spacing": "0.45em" };
    expect(
      countVarsOffBaseline(o, base, ["--ft-font-scale", "--ft-word-spacing", "--radius"]),
    ).toBe(3);
  });

  it("treats an empty string as not set", () => {
    expect(countVarsOffBaseline({ "--radius": "" }, {}, ["--radius"])).toBe(0);
  });

  it("compares the typography vars by value, not spelling", () => {
    // Size nudged up and back to 100% clears the var; a stored "1.0"
    // baseline is the same look.
    expect(
      countVarsOffBaseline({}, { "--ft-font-scale": "1.0" }, ["--ft-font-scale"]),
    ).toBe(0);
    expect(
      countVarsOffBaseline(
        { "--ft-font-scale": "1.10", "--ft-word-spacing": "0.3em" },
        { "--ft-font-scale": "1.1", "--ft-word-spacing": "0.30em" },
        ["--ft-font-scale", "--ft-word-spacing"],
      ),
    ).toBe(0);
    expect(
      countVarsOffBaseline({ "--ft-font-scale": "1.025" }, { "--ft-font-scale": "1.0" }, [
        "--ft-font-scale",
      ]),
    ).toBe(1);
  });

  it("only looks at the vars it's given", () => {
    const o: ThemeOverrides = { ...base, "--primary": "#000" };
    expect(countVarsOffBaseline(o, base, ["--ft-font-scale", "--radius"])).toBe(0);
    expect(countVarsOffBaseline(o, base, ["--primary"])).toBe(1);
  });
});

describe("restoreVarsToBaseline", () => {
  it("puts the palette's values back and removes vars it doesn't set", () => {
    const o: ThemeOverrides = {
      "--ft-font-scale": "1.3",
      "--ft-word-spacing": "0.45em",
      "--primary": "#123456",
    };
    const next = restoreVarsToBaseline(o, { "--ft-font-scale": "1.1" }, [
      "--ft-font-family",
      "--ft-font-scale",
      "--ft-word-spacing",
    ]);
    expect(next).toEqual({ "--ft-font-scale": "1.1", "--primary": "#123456" });
    expect("--ft-word-spacing" in next).toBe(false);
    // Never mutates its input.
    expect(o["--ft-font-scale"]).toBe("1.3");
  });

  it("removes a var whose baseline is only the :root default", () => {
    const next = restoreVarsToBaseline(
      { "--ft-font-scale": "1.3" },
      { "--ft-font-scale": "1.0" },
      ["--ft-font-scale"],
    );
    expect(next).toEqual({});
  });
});

describe("overridesMatchBaseline / switchDiscardsChanges", () => {
  const b = paletteBaseline(cyberpunk);

  it("matches only when every var either sets agrees", () => {
    expect(overridesMatchBaseline(b.themeOverrides, b.themeOverrides)).toBe(true);
    expect(overridesMatchBaseline({}, {})).toBe(true);
    expect(overridesMatchBaseline({ ...b.themeOverrides, "--primary": "#000" }, b.themeOverrides)).toBe(false);
    expect(overridesMatchBaseline({ "--ft-font-scale": "1.1" }, b.themeOverrides)).toBe(false);
  });

  it("loses nothing while the palette is untouched", () => {
    expect(switchDiscardsChanges(b.themeOverrides, b.keyboard, b)).toBe(false);
    const d = paletteBaseline(undefined);
    expect(switchDiscardsChanges({}, DEFAULT_KEYBOARD, d)).toBe(false);
  });

  it("loses nothing when a stored preset value only restates the default", () => {
    // Picked before presets dropped "1.0", then Size nudged up and back.
    const c = paletteBaseline(catppuccin);
    expect(switchDiscardsChanges({ "--ft-font-scale": "1.0" }, c.keyboard, c)).toBe(false);
    expect(switchDiscardsChanges({}, c.keyboard, { ...c, themeOverrides: { "--ft-font-scale": "1.0" } })).toBe(false);
  });

  it("loses an override or a keyboard change", () => {
    expect(
      switchDiscardsChanges({ ...b.themeOverrides, "--radius": "1.5rem" }, b.keyboard, b),
    ).toBe(true);
    expect(
      switchDiscardsChanges(b.themeOverrides, { ...b.keyboard, design: "glass" }, b),
    ).toBe(true);
    // compact has no control on the Keyboard page but a switch still
    // rewrites it.
    expect(
      switchDiscardsChanges(b.themeOverrides, { ...b.keyboard, compact: true }, b),
    ).toBe(true);
  });
});

describe("paletteAfterRestore", () => {
  const b = paletteBaseline(cyberpunk).themeOverrides;
  const fork = {
    activeId: CUSTOM,
    base: { id: "cyberpunk", light: {}, dark: {} },
  };

  it("returns a custom fork back to its palette once it matches again", () => {
    const after = paletteAfterRestore(fork, b, b, CUSTOM);
    expect(after).toEqual(paletteSliceFor("cyberpunk"));
  });

  it("returns a fork off Background reactive to Reactive, not Default", () => {
    const reactiveFork = {
      activeId: CUSTOM,
      base: { id: "background-reactive", light: {}, dark: {} },
    };
    expect(paletteAfterRestore(reactiveFork, {}, {}, CUSTOM)).toEqual({
      activeId: "background-reactive",
    });
  });

  it("returns a baseless fork to Default once no overrides are left", () => {
    expect(paletteAfterRestore({ activeId: CUSTOM }, {}, {}, CUSTOM)).toEqual({
      activeId: null,
    });
  });

  it("keeps the fork while anything still differs", () => {
    const o = { ...b, "--primary": "#000" };
    expect(paletteAfterRestore(fork, o, b, CUSTOM)).toBe(fork);
  });

  it("never touches a named palette", () => {
    const named = { activeId: "cyberpunk" };
    expect(paletteAfterRestore(named, {}, b, CUSTOM)).toBe(named);
  });
});

describe("paletteSwitchDecision", () => {
  const base = { activeId: "cyberpunk", discardsChanges: true, skipConfirm: false };

  it("does nothing when the active palette is picked again", () => {
    expect(paletteSwitchDecision({ ...base, targetId: "cyberpunk" })).toBe("noop");
    expect(
      paletteSwitchDecision({ ...base, activeId: null, targetId: null }),
    ).toBe("noop");
  });

  it("asks only when the switch would drop changes", () => {
    expect(paletteSwitchDecision({ ...base, targetId: null })).toBe("confirm");
    expect(
      paletteSwitchDecision({ ...base, targetId: "catppuccin", discardsChanges: false }),
    ).toBe("apply");
  });

  it("respects the browser's don't-ask-again flag", () => {
    expect(
      paletteSwitchDecision({ ...base, targetId: "catppuccin", skipConfirm: true }),
    ).toBe("apply");
  });
});
