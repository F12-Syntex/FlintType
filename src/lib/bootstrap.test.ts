import { describe, expect, it } from "vitest";
import { PREFS_BOOTSTRAP_SCRIPT } from "./bootstrap";

/** Run the inline bootstrap script against lightweight `window` /
 *  `document` stubs (no jsdom needed — the script only touches a handful
 *  of DOM methods) and return the resulting `<html>` attribute map. */
function runBootstrap(raw: string | null): Record<string, string> {
  const attrs: Record<string, string> = {};
  const root = {
    setAttribute(k: string, v: string) {
      attrs[k] = v;
    },
    removeAttribute(k: string) {
      delete attrs[k];
    },
    getAttribute(k: string) {
      return attrs[k] ?? null;
    },
    style: { setProperty() {} },
  };
  const g = globalThis as Record<string, unknown>;
  const prevWindow = g.window;
  const prevDocument = g.document;
  g.window = { localStorage: { getItem: () => raw } };
  g.document = { documentElement: root };
  try {
    // The script is a self-invoking IIFE; running it applies the attrs.
    new Function(PREFS_BOOTSTRAP_SCRIPT)();
  } finally {
    g.window = prevWindow;
    g.document = prevDocument;
  }
  return attrs;
}

describe("PREFS_BOOTSTRAP_SCRIPT — appearance defaults (FT-060)", () => {
  it("applies the shipped DEFAULT_APPEARANCE attrs for a fresh visitor (no stored blob)", () => {
    const attrs = runBootstrap(null);
    // Monkeytype-leaning shipped defaults that differ from the CSS
    // attr-absent state must be SET pre-paint, or the chrome flips after
    // hydration.
    expect(attrs["data-ft-cards"]).toBe("subtle");
    expect(attrs["data-ft-dividers"]).toBe("hidden");
    expect(attrs["data-ft-topbar-style"]).toBe("flat");
    expect(attrs["data-ft-autohide"]).toBe("fade");
    // Fields whose default equals the attr-absent state stay unset.
    expect(attrs["data-ft-padding"]).toBeUndefined();
    expect(attrs["data-ft-bg-fill"]).toBeUndefined();
    expect(attrs["data-ft-footer-style"]).toBeUndefined();
    expect(attrs["data-ft-result"]).toBeUndefined();
    expect(attrs["data-ft-monochrome"]).toBeUndefined();
  });

  it("applies the same defaults when the blob has no appearance slice", () => {
    const attrs = runBootstrap(JSON.stringify({ theme: {} }));
    expect(attrs["data-ft-cards"]).toBe("subtle");
    expect(attrs["data-ft-autohide"]).toBe("fade");
  });

  it("removes the attr when a stored value matches the CSS attr-absent state", () => {
    const attrs = runBootstrap(
      JSON.stringify({
        appearance: { cardSurfaces: "solid", autoHide: "off" },
      }),
    );
    // solid / off are the attr-absent states → removed; CSS renders them.
    expect(attrs["data-ft-cards"]).toBeUndefined();
    expect(attrs["data-ft-autohide"]).toBeUndefined();
    // Untouched fields still get their shipped defaults.
    expect(attrs["data-ft-dividers"]).toBe("hidden");
  });

  it("sets a non-default stored value", () => {
    const attrs = runBootstrap(
      JSON.stringify({ appearance: { dividers: "dotted", borders: "soft" } }),
    );
    expect(attrs["data-ft-dividers"]).toBe("dotted");
    expect(attrs["data-ft-borders"]).toBe("soft");
  });
});
