import { describe, expect, it } from "vitest";
import type { CurrentSettings, ImportItem, ImportPlan, ImportTarget } from "@/types/settings-import";
import sample from "./fixtures/monkeytype-settings.json";
import { planFlinttype } from "./flinttype";
import { planMonkeytype } from "./monkeytype";
import { readCurrentSettings } from "./slices";

const GROUPS = [
  { id: "theme", name: "Theme" },
  { id: "rest", name: "Everything else" },
];
const groupOf = (t: ImportTarget) =>
  t.kind === "theme" || t.kind === "palette" || t.kind === "mode" ? "theme" : "rest";

const fresh = (): CurrentSettings => readCurrentSettings(null);
const plan = (slices: Record<string, unknown>, cur = fresh()) =>
  planFlinttype(slices, cur, { fileLabel: "x.json", settingsInFile: 1 }, GROUPS, groupOf);
const all = (p: ImportPlan): ImportItem[] => p.groups.flatMap((g) => [...g.items, ...g.unchanged]);
const changed = (p: ImportPlan) => p.groups.flatMap((g) => g.items).map((i) => i.id);
const valueOf = (p: ImportPlan, id: string) => all(p).find((i) => i.id === id)?.value;

describe("planFlinttype slices", () => {
  it("lists the file's change, with your value now", () => {
    const p = plan({ appearance: { uiFont: "mono" } });
    expect(changed(p)).toEqual(["appearance.uiFont"]);
    expect(p.groups[0].items[0]).toMatchObject({ label: "App font", now: "Sans", to: "Mono" });
  });

  it("treats a slice as whole: a field the file leaves out goes back to its default", () => {
    const cur = fresh();
    cur.slices.caret = { ...cur.slices.caret, radius: 0, width: 4 };
    const p = plan({ caret: { style: "block", width: 4 } }, cur);
    expect(changed(p).sort()).toEqual(["caret.radius", "caret.style"]);
    expect(valueOf(p, "caret.radius")).toBe(fresh().slices.caret.radius);
    expect(p.skipped).toEqual([]);
  });

  it("drops unknown enum values and clamps numbers", () => {
    const p = plan({ appearance: { controlShape: "banana", keymapSize: 999, depth: "flat" } });
    expect(changed(p)).not.toContain("appearance.controlShape");
    expect(valueOf(p, "appearance.keymapSize")).toBe(3.5);
    expect(valueOf(p, "appearance.depth")).toBe("flat");
    expect(p.skipped).toEqual([
      expect.objectContaining({ key: "appearance.controlShape", label: "Button shape", reason: "bad-value" }),
    ]);
  });

  it("allows Full or 30 to 200 characters for line width", () => {
    expect(valueOf(plan({ appearance: { maxLineWidth: 0 } }), "appearance.maxLineWidth")).toBe(0);
    expect(valueOf(plan({ appearance: { maxLineWidth: 12 } }), "appearance.maxLineWidth")).toBe(30);
    expect(valueOf(plan({ appearance: { maxLineWidth: 900 } }), "appearance.maxLineWidth")).toBe(200);
    expect(plan({ appearance: { maxLineWidth: -5 } }).skipped[0].key).toBe("appearance.maxLineWidth");
  });

  it("reads the old shipped live stats colour as following the palette", () => {
    const p = plan({ appearance: { liveStatsColor: "#f97316" } });
    expect(all(p).find((i) => i.id === "appearance.liveStatsColor")).toMatchObject({ value: "", extra: { liveStatsColorPicked: true } });
    const picked = plan({ appearance: { liveStatsColor: "#f97316", liveStatsColorPicked: true } });
    expect(valueOf(picked, "appearance.liveStatsColor")).toBe("#f97316");
    expect(picked.skipped).toEqual([]);
  });

  it("imports the sound and hand layout slices", () => {
    const fingers = Object.fromEntries(
      ["L5", "L4", "L3", "L2", "L1", "R1", "R2", "R3", "R4", "R5"].map((f) => [f, { enabled: f !== "L5", homeKey: "KeyA" }]),
    );
    const p = plan({ audio: { keypressClickEnabled: true }, handLayout: { fingers } });
    expect(changed(p)).toEqual(["audio.keypressClickEnabled", "handLayout.fingers"]);
    expect(all(p).find((i) => i.id === "handLayout.fingers")).toMatchObject({
      now: "10 fingers, standard home keys",
      to: "9 fingers, your own home keys",
    });
    expect(plan({ handLayout: { fingers: { L5: { enabled: "yes" } } } }).skipped[0].key).toBe("handLayout.fingers");
  });

  it("keeps a dead setting counted but unnamed", () => {
    expect(all(plan({ behaviour: { quickRestart: true } })).find((i) => i.id === "behaviour.quickRestart")?.hidden).toBe(true);
  });

  it("lists values the user already has as unchanged", () => {
    const p = plan({ caret: { style: "line", width: 5 } });
    expect(p.groups[0].items.map((i) => i.id)).toEqual(["caret.width"]);
    expect(p.groups[0].unchanged.map((i) => i.id)).toContain("caret.style");
  });

  it("counts fields and slices it doesn't know as one line", () => {
    const p = plan({ caret: { sparkle: 1, glitter: 2 }, appearance: 5 });
    expect(p.skipped).toEqual([expect.objectContaining({ key: "unrecognised", label: "3 settings", count: 3 })]);
  });

  it("never throws on fields named like Object.prototype members", () => {
    const file = JSON.parse('{"appearance":{"constructor":1,"toString":2,"hasOwnProperty":3,"__proto__":4},"caret":{"__proto__":{"x":1}}}');
    const p = plan(file);
    expect(p.skipped).toEqual([expect.objectContaining({ key: "unrecognised", count: 5 })]);
  });
});

describe("planFlinttype test setup", () => {
  it("checks the length against the mode it lands on", () => {
    expect(valueOf(plan({ practice: { mode: "QUOTE", length: 2 } }), "practice.length")).toBe(2);
    const p = plan({ practice: { mode: "QUOTE", length: 25 } });
    expect(p.skipped[0]).toMatchObject({ key: "practice.length", reason: "bad-value" });
    // 25 words can't run as a quote, so the quote starts on its default.
    expect(valueOf(p, "practice.length")).toBe(1);
    // A length the mode can't run is listed; the stored one stays.
    const zero = plan({ practice: { mode: "WORDS", length: 0 } });
    expect(valueOf(zero, "practice.length")).toBeUndefined();
    expect(zero.skipped[0].key).toBe("practice.length");
  });

  it("starts a new mode on its default when the file's length can't be used", () => {
    // The stored 25 words would otherwise run as a 25-second test.
    const p = plan({ practice: { mode: "TIME", length: "long" } });
    expect(p.skipped[0].key).toBe("practice.length");
    expect(valueOf(p, "practice.length")).toBe(30);
  });

  it("uses the mode's own default when the file has no length", () => {
    expect(valueOf(plan({ practice: { mode: "TIME" } }), "practice.length")).toBe(30);
  });

  it("keeps the stored mode when the file's mode can't be used, and checks the length against it", () => {
    const cur = fresh();
    cur.slices.practice = { ...cur.slices.practice, mode: "QUOTE", length: 2 };
    const p = plan({ practice: { mode: "ZEN", length: 3 } }, cur);
    expect(p.skipped[0].key).toBe("practice.mode");
    expect(valueOf(p, "practice.length")).toBe(3);
    expect(plan({ practice: { mode: "ZEN", length: 300 } }, cur).skipped.map((s) => s.key)).toEqual(["practice.mode", "practice.length"]);
  });
});

describe("planFlinttype colours", () => {
  it("never applies theme keys that aren't settings, or unsafe values", () => {
    const p = plan({
      theme: { display: "none", "--primary": "#ff0000", "--background": "red; display:none", "--ring": "url(x)" },
      palette: { activeId: null },
    });
    expect(changed(p)).toEqual(["theme.--primary"]);
    expect(p.skipped.map((s) => s.key)).toEqual(["theme.--background", "theme.--ring", "unrecognised"]);
    expect(p.skipped[2].label).toBe("1 setting");
  });

  it("checks numeric overrides against their controls", () => {
    const p = plan({ theme: { "--ft-font-scale": "50", "--ft-word-spacing": "9em", "--radius": "40rem" } });
    expect(p.skipped.map((s) => s.key)).toEqual(["theme.--ft-font-scale", "theme.--ft-word-spacing", "theme.--radius"]);
    const ok = plan({ theme: { "--ft-font-scale": "1.5", "--ft-word-spacing": "0.45em", "--radius": "0rem" } });
    expect(changed(ok)).toEqual(["theme.--ft-font-scale", "theme.--ft-word-spacing", "theme.--radius"]);
  });

  it("clears overrides you have that the file doesn't, back to the palette's own", () => {
    const cur = fresh();
    cur.theme = { "--primary": "#00ff00", "--ft-font-scale": "1.5" };
    const p = plan({ palette: { activeId: "dracula" }, theme: {} }, cur);
    const clears = all(p).filter((i) => i.target.kind === "theme");
    expect(clears.map((i) => [i.id, i.value, i.now, i.to])).toEqual([
      ["theme.--primary", null, "#00ff00", "Palette's own"],
      ["theme.--ft-font-scale", null, "60px", "40px"],
    ]);
  });

  it("reads a file without a palette as Default", () => {
    const cur = fresh();
    cur.palette = { activeId: "nord" };
    expect(valueOf(plan({ theme: { "--primary": "#ff0000" } }, cur), "palette")).toEqual({ activeId: null });
  });

  it("leaves colours alone when the file has neither theme nor palette", () => {
    const cur = fresh();
    cur.theme = { "--primary": "#00ff00" };
    expect(all(plan({ caret: { style: "block" } }, cur)).some((i) => i.target.kind !== "slice")).toBe(false);
  });

  it("rebuilds the palette from the registry, never from the file", () => {
    const named = plan({ palette: { activeId: "catppuccin", varsLight: { "--x": "evil" } } });
    const slice = valueOf(named, "palette") as { activeId: string; varsLight: Record<string, string> };
    expect(slice.activeId).toBe("catppuccin");
    expect(slice.varsLight["--x"]).toBeUndefined();
    expect(plan({ palette: { activeId: "nope" } }).skipped[0]).toMatchObject({ key: "palette", reason: "bad-value" });
    expect(plan({ palette: { activeId: "constructor" } }).skipped[0]).toMatchObject({ key: "palette" });
    const fork = valueOf(plan({ palette: { activeId: "custom", base: { id: "nord", light: { evil: "x" } } } }), "palette") as {
      base?: { id: string; light: Record<string, string> };
    };
    expect(fork.base?.id).toBe("nord");
    expect(fork.base?.light.evil).toBeUndefined();
  });
});

describe("a file from the other app", () => {
  it("doesn't throw when a flinttype export is read as MonkeyType settings", () => {
    const p = planMonkeytype({ app: "flinttype", version: 1, slices: {} }, fresh(), null);
    expect(p.groups).toEqual([]);
  });

  it("finds no flinttype settings in a MonkeyType file", () => {
    const p = plan(sample as unknown as Record<string, unknown>);
    expect(p.groups).toEqual([]);
    expect(p.skipped.map((s) => s.key)).toEqual(["theme", "unrecognised"]);
  });
});
