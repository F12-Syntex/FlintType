import { describe, expect, it } from "vitest";
import { describeCatalog, KNOBS, resolveAi } from "./options";

describe("resolveAi — options", () => {
  it("resolves enum + theme + behaviour choices into one patch", () => {
    const { patch, changes } = resolveAi({
      options: { accent: "teal", surface: "midnight", font: "serif", stopOnError: "on" },
    });
    expect(patch.theme["--primary"]).toMatch(/^oklch\(/);
    expect(patch.theme["--background"]).toMatch(/^oklch\(/);
    expect(patch.theme["--ft-font-family"]).toContain("serif");
    expect(patch.behaviour.stopOnError).toBe(true);
    expect(changes.length).toBe(4);
  });

  it("accepts boolean choices for on/off knobs", () => {
    const { patch } = resolveAi({ options: { strictSpace: true, allowExtras: false } });
    expect(patch.behaviour.strictSpace).toBe(true);
    expect(patch.behaviour.allowExtras).toBe(false);
  });

  it("maps preset knobs to their numeric values", () => {
    const { patch } = resolveAi({ options: { fontSize: "large", lines: "all", width: "narrow" } });
    expect(patch.theme["--ft-font-scale"]).toBe("1.3");
    expect(patch.appearance.linesRendered).toBe(0);
    expect(patch.appearance.maxLineWidth).toBe(60);
  });

  it("drops unknown knobs and invalid option ids", () => {
    const { patch, changes } = resolveAi({
      options: { accent: "ultraviolet", bogusKnob: "x", surface: "sepia" },
    });
    expect("--primary" in patch.theme).toBe(false); // invalid accent dropped
    expect(patch.theme["--background"]).toBeDefined(); // valid surface kept
    expect(changes).toEqual([{ label: "Surface", value: "Sepia" }]);
  });

  it("resolves randomize to a valid option per knob", () => {
    const { patch, changes } = resolveAi({ randomize: ["accent", "font"] });
    expect(patch.theme["--primary"]).toMatch(/^oklch\(/);
    expect(patch.theme["--ft-font-family"]).toBeDefined();
    expect(changes.length).toBe(2);
  });

  it("lets explicit options win over randomize on the same knob", () => {
    const { patch } = resolveAi({
      randomize: ["radius"],
      options: { radius: "sharp" },
    });
    expect(patch.theme["--radius"]).toBe("0rem");
  });

  it("returns an empty patch for junk input", () => {
    expect(resolveAi({}).patch).toEqual({
      theme: {},
      appearance: {},
      background: {},
      behaviour: {},
    });
  });
});

describe("describeCatalog", () => {
  it("lists every knob and its ids", () => {
    const text = describeCatalog();
    for (const knob of Object.keys(KNOBS)) {
      expect(text).toContain(`- ${knob}:`);
    }
    expect(text).toContain("teal");
    expect(text).toContain("midnight");
  });
});
