import { describe, expect, it } from "vitest";
import {
  findFontByStack,
  FONT_CATALOG,
  googleFontHref,
} from "./catalog";

describe("googleFontHref", () => {
  it("encodes single-word family names", () => {
    expect(googleFontHref("Inter")).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",
    );
  });

  it("encodes spaces as + so the URL is well-formed", () => {
    expect(googleFontHref("Source Code Pro")).toBe(
      "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap",
    );
  });

  it("threads custom weights through unchanged", () => {
    expect(googleFontHref("Inter", "100..900")).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
    );
  });

  it("requests display=swap so the passage doesn't FOIT", () => {
    expect(googleFontHref("Roboto")).toContain("display=swap");
  });
});

describe("FONT_CATALOG", () => {
  it("has unique ids", () => {
    const ids = FONT_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique family names", () => {
    const names = FONT_CATALOG.map((e) => e.family);
    expect(new Set(names).size).toBe(names.length);
  });

  it("declares a fallback in every stack", () => {
    for (const e of FONT_CATALOG) {
      expect(e.stack.includes(",")).toBe(true);
      expect(e.stack.startsWith(`"${e.family}"`)).toBe(true);
    }
  });

  it("ids are url-safe (lowercase, no spaces)", () => {
    for (const e of FONT_CATALOG) {
      expect(e.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("ships at least a dozen monospaces — the typing audience", () => {
    const monos = FONT_CATALOG.filter((e) => e.category === "mono");
    expect(monos.length).toBeGreaterThanOrEqual(10);
  });
});

describe("findFontByStack", () => {
  it("matches the first quoted family in a stack", () => {
    const found = findFontByStack(`"Inter", system-ui, sans-serif`);
    expect(found?.family).toBe("Inter");
  });

  it("matches an unquoted family", () => {
    const found = findFontByStack(`Roboto Mono, ui-monospace, monospace`);
    expect(found?.family).toBe("Roboto Mono");
  });

  it("returns null for system stacks", () => {
    expect(
      findFontByStack(
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      ),
    ).toBeNull();
  });

  it("returns null for undefined / empty input", () => {
    expect(findFontByStack(undefined)).toBeNull();
    expect(findFontByStack("")).toBeNull();
    expect(findFontByStack("   ")).toBeNull();
  });
});
