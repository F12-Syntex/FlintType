import { describe, expect, it } from "vitest";
import { parseColor } from "./color";
import { mergeBuckets, randomFieldValue, resolveTools } from "./tools";

describe("randomFieldValue", () => {
  it("returns one of the enum values for an enum field", () => {
    const v = randomFieldValue("tapeMode", false);
    expect(["off", "word", "letter"]).toContain(v);
  });
  it("returns a boolean for a bool field", () => {
    expect(typeof randomFieldValue("monochromeChrome", false)).toBe("boolean");
  });
  it("returns an in-range int for an int field", () => {
    const v = randomFieldValue("linesRendered", false) as number;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(6);
  });
  it("returns a valid oklch for a colour var", () => {
    const v = randomFieldValue("--primary", false) as string;
    expect(parseColor(v)).not.toBeNull();
  });
  it("returns a rem for radius and a stack for font", () => {
    expect(randomFieldValue("--radius", false)).toMatch(/rem$/);
    expect(String(randomFieldValue("--ft-font-family", false))).toMatch(/,/);
  });
  it("returns null for an unknown field", () => {
    expect(randomFieldValue("nope", false)).toBeNull();
  });
});

describe("resolveTools — randomize", () => {
  it("buckets theme vars and appearance keys correctly", () => {
    const r = resolveTools({ randomize: ["--primary", "tapeMode", "bogus"] }, undefined);
    expect(parseColor(r.theme["--primary"])).not.toBeNull();
    expect(["off", "word", "letter"]).toContain(r.appearance.tapeMode);
    expect("bogus" in r.appearance).toBe(false);
    expect(r.changes[0]?.label).toBe("Randomised");
  });
});

describe("resolveTools — palette", () => {
  it("builds a matching palette from a base var in current state", () => {
    const current = { theme: { "--primary": "oklch(0.65 0.2 30)" } };
    const r = resolveTools({ palette: { base: "--primary", harmony: "analogous" } }, current);
    expect(Object.keys(r.theme).length).toBeGreaterThan(5);
    expect(parseColor(r.theme["--background"])!.h).toBeCloseTo(30, 0);
    expect(r.changes[0]?.label).toBe("Palette");
  });

  it("uses the dark ramp when the current background is dark", () => {
    const current = { theme: { "--background": "oklch(0.15 0.01 85)" } };
    const r = resolveTools({ palette: { base: "oklch(0.7 0.2 200)" } }, current);
    expect(parseColor(r.theme["--background"])!.l).toBeLessThan(0.3);
  });

  it("falls back to a random base when none is parseable", () => {
    const r = resolveTools({ palette: {} }, undefined);
    expect(Object.keys(r.theme).length).toBeGreaterThan(0);
  });

  it("honours an explicit roles list", () => {
    const r = resolveTools(
      { palette: { base: "oklch(0.6 0.2 90)", roles: ["--primary"] } },
      undefined,
    );
    expect(Object.keys(r.theme)).toEqual(["--primary"]);
  });
});

describe("resolveTools — guards", () => {
  it("returns empty buckets for non-object tools", () => {
    const r = resolveTools("nope", undefined);
    expect(r).toEqual({ theme: {}, appearance: {}, background: {}, changes: [] });
  });
});

describe("mergeBuckets", () => {
  it("lets a direct value win over a tool fill on the same key", () => {
    const resolved = resolveTools({ palette: { base: "oklch(0.6 0.2 90)" } }, undefined);
    const merged = mergeBuckets(
      { theme: { "--primary": "oklch(0.5 0.3 0)" } },
      resolved,
    );
    expect(merged.theme["--primary"]).toBe("oklch(0.5 0.3 0)");
    // a role only the palette set survives
    expect(merged.theme["--background"]).toBeDefined();
  });
});
