import { describe, expect, it, vi } from "vitest";
import { SETTINGS_GROUPS } from "@/app/customise/_components/groups";
import { DEFAULT_APPEARANCE } from "@/lib/appearance-prefs";
import { DEFAULT_AUDIO } from "@/lib/audio-prefs";
import { DEFAULT_BEHAVIOUR } from "@/lib/behaviour-prefs";
import { DEFAULT_CARET } from "@/lib/caret-settings";
import { DEFAULT_KEYBOARD } from "@/lib/keyboard-settings";
import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
import { behaviourEntries } from "./entries-behaviour";
import { DEFAULT_PALETTE_OPTION, generalEntries } from "./entries-general";
import { interfaceEntries } from "./entries-interface";
import { keyboardEntries } from "./entries-keyboard";
import { navigateEntries, SETTINGS_PAGES } from "./entries-navigate";
import { statsEntries } from "./entries-stats";
import { typingEntries } from "./entries-typing";
import type { CommandEntry, EnumEntry, ToggleEntry } from "./types";

const THEMES = [
  { id: "catppuccin", name: "Catppuccin" },
  { id: "cyberpunk", name: "Cyberpunk" },
];

function general(paletteId: string | null = null) {
  const applyPalette = vi.fn();
  const resetPalette = vi.fn();
  const entries = generalEntries({
    mode: "light",
    setMode: vi.fn(),
    paletteId,
    themes: THEMES,
    applyPalette,
    resetPalette,
  });
  const palette = entries.find((e) => e.id === "palette") as EnumEntry;
  return { entries, palette, applyPalette, resetPalette };
}

function all(): CommandEntry[] {
  const ap = DEFAULT_APPEARANCE;
  return [
    ...general().entries,
    ...behaviourEntries({
      bp: DEFAULT_BEHAVIOUR,
      setBp: vi.fn(),
      audio: DEFAULT_AUDIO,
      setAudio: vi.fn(),
    }),
    ...typingEntries({ ap, setAp: vi.fn(), cs: DEFAULT_CARET, setCs: vi.fn() }),
    ...keyboardEntries({ ap, setAp: vi.fn(), ks: DEFAULT_KEYBOARD, setKs: vi.fn() }),
    ...interfaceEntries({ ap, setAp: vi.fn() }),
    ...statsEntries({ ap, setAp: vi.fn() }),
    ...navigateEntries(vi.fn()),
  ];
}

describe("command palette entries", () => {
  it("gives every entry a unique id", () => {
    const ids = all().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every hint to one short line", () => {
    for (const e of all()) {
      expect(e.hint?.length ?? 0, e.id).toBeLessThanOrEqual(80);
    }
  });

  it("shows each enum's current value as one of its options", () => {
    for (const e of all()) {
      if (e.kind !== "enum") continue;
      expect(e.options.map((o) => o.id), e.id).toContain(e.value);
    }
  });

  it("links only to settings anchors that exist", () => {
    const anchors = new Set(
      SETTINGS_GROUPS.flatMap((g) => [
        ...g.sections.map((s) => `${g.href}#${s.id}`),
        ...(g.rowAnchors ?? []).map((a) => `${g.href}#${a}`),
      ]),
    );
    anchors.add("/customise/appearance/themes");
    for (const e of all()) {
      if (e.kind === "link") expect(anchors, e.id).toContain(e.href);
    }
  });

  it("names every settings page like the settings catalog", () => {
    expect(
      SETTINGS_PAGES.map((p) => ({ id: p.id, name: p.name, href: p.href })),
    ).toEqual(
      SETTINGS_GROUPS.map((g) => ({ id: g.id, name: g.name, href: g.href })),
    );
  });

  it("navigates with the router callback", () => {
    const go = vi.fn();
    const entry = navigateEntries(go).find((e) => e.id === "nav.settings.keyboard");
    if (entry?.kind !== "action") throw new Error("missing entry");
    entry.run();
    expect(go).toHaveBeenCalledWith("/customise/keyboard");
  });
});

describe("palette entry", () => {
  it("lists Default first and shows it while no palette is picked", () => {
    const { palette } = general(null);
    expect(palette.options[0]).toEqual({
      id: DEFAULT_PALETTE_OPTION,
      label: "Default",
    });
    expect(palette.value).toBe(DEFAULT_PALETTE_OPTION);
    expect(palette.options.some((o) => o.id === CUSTOM_THEME_ID)).toBe(false);
  });

  it("offers Custom only while a custom palette is active", () => {
    const { palette } = general(CUSTOM_THEME_ID);
    expect(palette.value).toBe(CUSTOM_THEME_ID);
    expect(palette.options.map((o) => o.label)).toContain("Custom");
  });

  it("resets to Default and applies other palettes", () => {
    const named = general("catppuccin");
    named.palette.set(DEFAULT_PALETTE_OPTION);
    expect(named.resetPalette).toHaveBeenCalledOnce();
    named.palette.set("cyberpunk");
    expect(named.applyPalette).toHaveBeenCalledWith("cyberpunk");
  });

  it("does nothing when the current palette is picked again", () => {
    const fresh = general(null);
    fresh.palette.set(DEFAULT_PALETTE_OPTION);
    expect(fresh.resetPalette).not.toHaveBeenCalled();
    const named = general("catppuccin");
    named.palette.set("catppuccin");
    expect(named.applyPalette).not.toHaveBeenCalled();
  });
});

describe("typing entries", () => {
  function typing(cs = DEFAULT_CARET, ap = DEFAULT_APPEARANCE) {
    const setCs = vi.fn();
    const setAp = vi.fn();
    const entries = typingEntries({ ap, setAp, cs, setCs });
    const get = (id: string) => entries.find((e) => e.id === id);
    return { get, setCs, setAp };
  }

  it("maps blink speeds to the settings presets", () => {
    const blink = typing({ ...DEFAULT_CARET, blinkSpeed: 1500 }).get("c.blink") as EnumEntry;
    expect(blink.value).toBe("slow");
    expect(blink.options.map((o) => o.label)).toEqual(["Off", "Slow", "Normal", "Fast"]);
    const { get, setCs } = typing();
    (get("c.blink") as EnumEntry).set("fast");
    expect(setCs).toHaveBeenCalledWith({ blinkSpeed: 500 });
  });

  it("maps caret movement to the nearest preset at or below", () => {
    expect((typing({ ...DEFAULT_CARET, smoothSpeed: 250 }).get("c.smooth") as EnumEntry).value).toBe("flow");
    const { get, setCs } = typing();
    (get("c.smooth") as EnumEntry).set("drift");
    expect(setCs).toHaveBeenCalledWith({ smoothSpeed: 450 });
  });

  it("flips the idle pulse as a toggle", () => {
    const { get, setAp } = typing(DEFAULT_CARET, { ...DEFAULT_APPEARANCE, caretIdle: "off" });
    const pulse = get("a.caretIdle") as ToggleEntry;
    expect(pulse.value).toBe(false);
    pulse.set(true);
    expect(setAp).toHaveBeenCalledWith("caretIdle", "pulse");
  });
});
