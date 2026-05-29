import { describe, expect, it } from "vitest";
import {
  sanitizeChanges,
  sanitizePatch,
  sanitizeSummary,
} from "./sanitize";

describe("sanitizePatch — theme vars", () => {
  it("keeps whitelisted vars with safe values", () => {
    const p = sanitizePatch({
      theme: { "--background": "oklch(0.95 0.05 140)", "--radius": "1rem" },
    });
    expect(p.theme).toEqual({
      "--background": "oklch(0.95 0.05 140)",
      "--radius": "1rem",
    });
  });

  it("drops unknown var names", () => {
    const p = sanitizePatch({ theme: { "--evil": "red", color: "red" } });
    expect(p.theme).toEqual({});
  });

  it("rejects values with CSS-breakout characters", () => {
    const p = sanitizePatch({
      theme: {
        "--primary": "red;} body{display:none",
        "--accent": "url(javascript:alert(1))",
        "--ring": "expression(alert(1))",
      },
    });
    expect(p.theme).toEqual({});
  });

  it("rejects over-long values", () => {
    const p = sanitizePatch({ theme: { "--primary": "a".repeat(81) } });
    expect(p.theme).toEqual({});
  });
});

describe("sanitizePatch — appearance", () => {
  it("keeps valid enums, bools and clamped ints", () => {
    const p = sanitizePatch({
      appearance: {
        tapeMode: "word",
        monochromeChrome: true,
        linesRendered: 99,
        maxLineWidth: -5,
      },
    });
    expect(p.appearance).toEqual({
      tapeMode: "word",
      monochromeChrome: true,
      linesRendered: 6,
      maxLineWidth: 0,
    });
  });

  it("drops invalid enum values and unknown keys", () => {
    const p = sanitizePatch({
      appearance: { tapeMode: "diagonal", nope: "x", mistakeStyle: 7 },
    });
    expect(p.appearance).toEqual({});
  });
});

describe("sanitizePatch — background", () => {
  it("keeps an http(s) image URL and clamps numbers", () => {
    const p = sanitizePatch({
      background: { imageUrl: "https://x.test/a.png", opacity: 2, fit: "cover" },
    });
    expect(p.background).toEqual({
      imageUrl: "https://x.test/a.png",
      opacity: 1,
      fit: "cover",
    });
  });

  it("rejects non-http image URLs", () => {
    const p = sanitizePatch({
      background: { imageUrl: "javascript:alert(1)" },
    });
    expect(p.background).toEqual({});
  });
});

describe("sanitizeSummary / sanitizeChanges", () => {
  it("falls back for a non-string summary and caps length", () => {
    expect(sanitizeSummary(123)).toBe("Proposed look.");
    expect(sanitizeSummary("x".repeat(300)).length).toBe(200);
  });

  it("keeps well-formed change rows and caps the count at 12", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      label: `L${i}`,
      value: `V${i}`,
    }));
    const out = sanitizeChanges(rows);
    expect(out.length).toBe(12);
    expect(out[0]).toEqual({ label: "L0", value: "V0" });
  });

  it("ignores malformed rows", () => {
    expect(sanitizeChanges(["x", { value: "no label" }, null])).toEqual([]);
  });
});
