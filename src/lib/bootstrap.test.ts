// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import {
  HTML_ATTR_RULES,
  htmlAttrsFor,
  htmlAttrValue,
  PREFS_BOOTSTRAP_SCRIPT,
} from "./bootstrap";

/** Run the inline bootstrap body exactly the way the `<head>` `<script>`
 *  does — it's an IIFE, so constructing a Function from the source and
 *  invoking it executes it against the test's jsdom window/document. */
function runBootstrap(): void {
  new Function(PREFS_BOOTSTRAP_SCRIPT)();
}

const PREFS_KEY = "flinttype:prefs:v1";

describe("PREFS_BOOTSTRAP_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute("style");
    for (const rule of HTML_ATTR_RULES) root.removeAttribute(rule.attr);
  });

  it("is syntactically valid JavaScript", () => {
    expect(() => new Function(PREFS_BOOTSTRAP_SCRIPT)).not.toThrow();
  });

  it("does nothing when there is no persisted blob", () => {
    runBootstrap();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  });

  it("paints the active palette's light vars before first paint", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        palette: {
          activeId: "catppuccin",
          varsLight: {
            "--primary": "oklch(0.55 0.25 297)",
            "--background": "oklch(0.96 0 0)",
          },
          varsDark: { "--primary": "oklch(0.7 0.2 300)" },
        },
      }),
    );
    localStorage.setItem("theme", "light");
    runBootstrap();
    const s = document.documentElement.style;
    expect(s.getPropertyValue("--primary")).toBe("oklch(0.55 0.25 297)");
    expect(s.getPropertyValue("--background")).toBe("oklch(0.96 0 0)");
  });

  it("paints the dark vars when next-themes mode is dark", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        palette: {
          activeId: "catppuccin",
          varsLight: { "--primary": "LIGHT" },
          varsDark: { "--primary": "DARK" },
        },
      }),
    );
    localStorage.setItem("theme", "dark");
    runBootstrap();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "DARK",
    );
  });

  it("ignores a palette slice that carries no persisted vars (Default / custom)", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ palette: { activeId: null } }),
    );
    localStorage.setItem("theme", "light");
    runBootstrap();
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "",
    );
  });

  it("still layers blob.theme per-var overrides on top of the palette", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        palette: {
          activeId: "catppuccin",
          varsLight: { "--primary": "PALETTE", "--background": "PALETTE_BG" },
          varsDark: {},
        },
        // A custom per-var override must win over the palette base.
        theme: { "--primary": "OVERRIDE" },
      }),
    );
    localStorage.setItem("theme", "light");
    runBootstrap();
    const s = document.documentElement.style;
    expect(s.getPropertyValue("--primary")).toBe("OVERRIDE");
    expect(s.getPropertyValue("--background")).toBe("PALETTE_BG");
  });

  it("paints the Style attributes before first paint", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        appearance: {
          controlShape: "square",
          depth: "lifted",
          buttonGlow: false,
          pageAura: false,
          uiFont: "mono",
          uiScale: "large",
        },
      }),
    );
    runBootstrap();
    const root = document.documentElement;
    expect(root.getAttribute("data-ft-controls")).toBe("square");
    expect(root.getAttribute("data-ft-depth")).toBe("lifted");
    expect(root.getAttribute("data-ft-glow")).toBe("off");
    expect(root.getAttribute("data-ft-aura")).toBe("off");
    expect(root.getAttribute("data-ft-ui-font")).toBe("mono");
    expect(root.getAttribute("data-ft-ui-scale")).toBe("large");
  });

  it("writes no Style attributes for the defaults", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        appearance: {
          controlShape: "pill",
          depth: "soft",
          buttonGlow: true,
          pageAura: true,
          uiFont: "sans",
          uiScale: "default",
        },
      }),
    );
    runBootstrap();
    const root = document.documentElement;
    for (const attr of [
      "data-ft-controls",
      "data-ft-depth",
      "data-ft-glow",
      "data-ft-aura",
      "data-ft-ui-font",
      "data-ft-ui-scale",
    ]) {
      expect(root.hasAttribute(attr)).toBe(false);
    }
  });

  it("matches htmlAttrsFor() for every mirrored attribute", () => {
    const appearance = {
      cardSurfaces: "transparent",
      dividers: "hairline",
      pagePadding: "tight",
      monochromeChrome: true,
      controlShape: "rounded",
      buttonGlow: true,
      pageAura: false,
      uiScale: "compact",
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify({ appearance }));
    runBootstrap();
    const root = document.documentElement;
    for (const [attr, value] of Object.entries(htmlAttrsFor(appearance))) {
      expect(root.getAttribute(attr)).toBe(value);
    }
  });
});

describe("htmlAttrValue", () => {
  const rule = (key: string) => HTML_ATTR_RULES.find((r) => r.key === key)!;

  it("omits an enum at its fallback and writes any other value", () => {
    expect(htmlAttrValue(rule("controlShape"), { controlShape: "pill" })).toBeNull();
    expect(htmlAttrValue(rule("controlShape"), { controlShape: "square" })).toBe("square");
  });

  it("ignores missing, empty and non-string enum values", () => {
    expect(htmlAttrValue(rule("depth"), {})).toBeNull();
    expect(htmlAttrValue(rule("depth"), { depth: "" })).toBeNull();
    expect(htmlAttrValue(rule("depth"), { depth: 3 })).toBeNull();
  });

  it("writes \"on\" only for a true default-off flag", () => {
    expect(htmlAttrValue(rule("monochromeChrome"), { monochromeChrome: true })).toBe("on");
    expect(htmlAttrValue(rule("monochromeChrome"), { monochromeChrome: false })).toBeNull();
    expect(htmlAttrValue(rule("monochromeChrome"), {})).toBeNull();
  });

  it("writes \"off\" only for a false default-on flag", () => {
    expect(htmlAttrValue(rule("buttonGlow"), { buttonGlow: false })).toBe("off");
    expect(htmlAttrValue(rule("buttonGlow"), { buttonGlow: true })).toBeNull();
    expect(htmlAttrValue(rule("pageAura"), {})).toBeNull();
  });

  it("gives every rule a unique attribute", () => {
    const attrs = HTML_ATTR_RULES.map((r) => r.attr);
    expect(new Set(attrs).size).toBe(attrs.length);
  });
});
