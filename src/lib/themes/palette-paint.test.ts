// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The store schedules a debounced backend save on every write.
vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: { get: async () => ({}), merge: async () => ({ ok: true }) },
  }),
}));

const sample = vi.hoisted(() => ({
  fn: vi.fn<(image: string, mode: string) => Promise<unknown>>(),
}));
vi.mock("./background-reactive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./background-reactive")>()),
  samplePalette: (image: string, mode: string) => sample.fn(image, mode),
}));

import { __resetForTests, readSlice, writeSlice } from "../prefs-store";
import type { ReactivePalette } from "./background-reactive";
import { type PaletteSlice, resolvePaletteBase } from "./palette-fork";
import {
  paintForkBase,
  paintNamed,
  paintReactive,
  type ReactiveSample,
} from "./palette-paint";
import { findTheme } from "./registry";

const cosmic = findTheme("cosmic-night");
const root = () => document.documentElement;
const v = (name: string) => root().style.getPropertyValue(name);

/** A sampled palette whose every var reads `color`. */
function reactive(color: string): ReactivePalette {
  return new Proxy({} as ReactivePalette, { get: () => color });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  __resetForTests();
  root().removeAttribute("style");
  sample.fn.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("paintNamed", () => {
  it("paints the palette for the mode with the overrides on top", () => {
    writeSlice("theme", { "--radius": "0rem" });
    paintNamed(root(), "cosmic-night", "dark");
    expect(v("--primary")).toBe(cosmic?.cssVars.dark.primary);
    // The override wins where the names collide.
    expect(v("--radius")).toBe("0rem");
  });

  it("clears the previous palette, reactive colours included", () => {
    root().style.setProperty("--primary", "red");
    root().style.setProperty("--secondary", "red");
    paintNamed(root(), null, "light");
    expect(v("--primary")).toBe("");
    expect(v("--secondary")).toBe("");
  });

  it("backfills the vars of a palette slice saved before they were persisted", () => {
    writeSlice("palette", { activeId: "cosmic-night" });
    paintNamed(root(), "cosmic-night", "light");
    const slice = readSlice<PaletteSlice>("palette", { activeId: null });
    expect(slice.varsLight?.["--primary"]).toBe(cosmic?.cssVars.light.primary);
  });
});

describe("paintForkBase", () => {
  it("uncovers the palette's own value for an override that was removed", () => {
    const base = resolvePaletteBase("cosmic-night");
    if (!base) throw new Error("cosmic-night is installed");
    // The fork had Accent and Background changed; Accent was reset, so
    // the overrides hook stripped its inline value.
    writeSlice("theme", { "--background": "#a3a3a3" });
    root().style.setProperty("--background", "#a3a3a3");
    paintForkBase(root(), base, "light");
    expect(v("--primary")).toBe(cosmic?.cssVars.light.primary);
    expect(v("--background")).toBe("#a3a3a3");
  });
});

describe("paintReactive", () => {
  it("paints a cached sample for the same image and mode at once", () => {
    const cache = {
      current: {
        image: "bg.png",
        mode: "light",
        palette: reactive("#111"),
      } as ReactiveSample,
    };
    writeSlice("theme", { "--primary": "#00ff00" });
    expect(paintReactive(root(), "bg.png", "light", cache)).toBeUndefined();
    expect(v("--background")).toBe("#111");
    expect(v("--primary")).toBe("#00ff00");
    expect(sample.fn).not.toHaveBeenCalled();
  });

  it("samples on a miss, swaps in one go and caches the result", async () => {
    const cache: { current: ReactiveSample | null } = {
      current: { image: "bg.png", mode: "light", palette: reactive("#111") },
    };
    root().style.setProperty("--background", "#111");
    sample.fn.mockResolvedValue(reactive("#222"));
    paintReactive(root(), "bg.png", "dark", cache);
    // The prior palette stays up until the sample lands.
    expect(v("--background")).toBe("#111");
    await vi.waitFor(() => expect(v("--background")).toBe("#222"));
    expect(sample.fn).toHaveBeenCalledWith("bg.png", "dark");
    expect(cache.current?.mode).toBe("dark");
  });

  it("caches but doesn't paint a sample that lands after a re-run", async () => {
    const cache: { current: ReactiveSample | null } = { current: null };
    let resolve: (p: ReactivePalette) => void = () => {};
    sample.fn.mockReturnValue(new Promise((r) => (resolve = r)));
    const cleanup = paintReactive(root(), "bg.png", "light", cache);
    cleanup?.();
    resolve(reactive("#333"));
    await vi.waitFor(() => expect(cache.current?.image).toBe("bg.png"));
    expect(v("--background")).toBe("");
  });

  it("clears the sampled colours when there is no image", () => {
    root().style.setProperty("--background", "#111");
    writeSlice("theme", { "--primary": "#00ff00" });
    paintReactive(root(), null, "light", { current: null });
    expect(v("--background")).toBe("");
    expect(v("--primary")).toBe("#00ff00");
  });
});
