// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { PREFS_BOOTSTRAP_SCRIPT } from "./bootstrap";

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
    document.documentElement.removeAttribute("style");
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
});
