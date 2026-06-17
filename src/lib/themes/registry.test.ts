import { describe, expect, it } from "vitest";
import { prefixCssVars, THEMES } from "./registry";

describe("prefixCssVars", () => {
  it("prepends -- to bare cssVars keys (the form themes.json stores)", () => {
    // A theme's cssVars keys are bare; the persisted palette + the
    // bootstrap's `--`-prefix guard need the `--` form, or every var is
    // silently dropped before first paint (the FT-028 FOUC).
    expect(
      prefixCssVars({ primary: "oklch(0.5 0.2 300)", background: "#fff" }),
    ).toEqual({
      "--primary": "oklch(0.5 0.2 300)",
      "--background": "#fff",
    });
  });

  it("leaves already-prefixed keys untouched (idempotent)", () => {
    expect(prefixCssVars({ "--primary": "a", radius: "0.5rem" })).toEqual({
      "--primary": "a",
      "--radius": "0.5rem",
    });
  });

  it("handles an empty map", () => {
    expect(prefixCssVars({})).toEqual({});
  });

  it("produces keys that match what applyTheme would set for a real theme", () => {
    // Guards against the registry storing keys in a different shape than
    // the bootstrap expects: every prefixed key must start with --.
    const theme = THEMES[0];
    if (!theme) return;
    const prefixed = prefixCssVars(theme.cssVars.light);
    const keys = Object.keys(prefixed);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => k.startsWith("--"))).toBe(true);
  });
});
