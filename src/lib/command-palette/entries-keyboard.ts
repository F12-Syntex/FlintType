import type { AppearancePrefs } from "@/lib/appearance-prefs";
import type { KeyboardSettings } from "@/lib/keyboard-settings";
import { enumEntry, type Setter, toggle } from "./entry-helpers";
import type { CommandEntry } from "./types";

type Layout = "qwerty" | "dvorak" | "colemak";

/** Settings → Keyboard, in the order the page lists them. */
export function keyboardEntries({
  ap,
  setAp,
  ks,
  setKs,
}: {
  ap: AppearancePrefs;
  setAp: Setter<AppearancePrefs>;
  ks: KeyboardSettings;
  setKs: (patch: Partial<KeyboardSettings>) => void;
}): CommandEntry[] {
  return [
    enumEntry(
      "a.keymap",
      "Show keyboard",
      "React lights the key you pressed; Next lights the key to press",
      "Keyboard",
      ap.keymap,
      [
        { id: "off", label: "Off" },
        { id: "static", label: "Static" },
        { id: "react", label: "React" },
        { id: "next", label: "Next" },
      ] as const,
      (v) => setAp("keymap", v),
      ["keyboard", "keymap"],
    ),
    enumEntry(
      "a.keymapLayout",
      "Keyboard layout",
      "The layout your keyboard uses",
      "Keyboard",
      (ap.keymapLayout === "dvorak" || ap.keymapLayout === "colemak"
        ? ap.keymapLayout
        : "qwerty") as Layout,
      [
        { id: "qwerty", label: "QWERTY" },
        { id: "dvorak", label: "Dvorak" },
        { id: "colemak", label: "Colemak" },
      ] as const,
      (v) => setAp("keymapLayout", v),
      ["keymap", "layout", "qwerty", "dvorak", "colemak"],
    ),
    enumEntry(
      "a.keymapStyle",
      "Key arrangement",
      "Staggered, matrix, split or Alice",
      "Keyboard",
      ap.keymapStyle,
      [
        { id: "staggered", label: "Staggered" },
        { id: "matrix", label: "Matrix" },
        { id: "split", label: "Split" },
        { id: "alice", label: "Alice" },
      ] as const,
      (v) => setAp("keymapStyle", v),
      ["keymap", "ortholinear", "ergonomic"],
    ),
    enumEntry(
      "k.design",
      "Key style",
      "Solid, outline, ghost, lifted or glass",
      "Keyboard",
      ks.design,
      [
        { id: "solid", label: "Solid" },
        { id: "outline", label: "Outline" },
        { id: "ghost", label: "Ghost" },
        { id: "lifted", label: "Lifted" },
        { id: "glass", label: "Glass" },
      ] as const,
      (v) => setKs({ design: v }),
      ["keyboard"],
    ),
    enumEntry(
      "k.shape",
      "Key shape",
      "Square, rounded or pill keys",
      "Keyboard",
      ks.shape,
      [
        { id: "square", label: "Square" },
        { id: "rounded", label: "Rounded" },
        { id: "pill", label: "Pill" },
      ] as const,
      (v) => setKs({ shape: v }),
      ["keyboard", "shape"],
    ),
    enumEntry(
      "a.keymapLegend",
      "Key labels",
      "Lower, upper, blank or dynamic",
      "Keyboard",
      ap.keymapLegend,
      [
        { id: "lowercase", label: "Lower" },
        { id: "uppercase", label: "Upper" },
        { id: "blank", label: "Blank" },
        { id: "dynamic", label: "Dynamic" },
      ] as const,
      (v) => setAp("keymapLegend", v),
      ["keymap", "legend"],
    ),
    enumEntry(
      "a.keymapTopRow",
      "Number row",
      "Always, auto or never",
      "Keyboard",
      ap.keymapTopRow,
      [
        { id: "always", label: "Always" },
        { id: "layout", label: "Auto" },
        { id: "never", label: "Never" },
      ] as const,
      (v) => setAp("keymapTopRow", v),
      ["keymap", "numbers"],
    ),
    toggle(
      "a.keymapCompact",
      "Letters only",
      "Hide the modifier keys and the space bar",
      "Keyboard",
      ap.keymapCompact,
      (v) => setAp("keymapCompact", v),
      ["keymap", "keyboard", "compact"],
    ),
    toggle(
      "k.highlightHomeRow",
      "Home row bumps",
      "Add the small bumps on F and J",
      "Keyboard",
      ks.highlightHomeRow,
      (v) => setKs({ highlightHomeRow: v }),
      ["keyboard", "homerow", "pegs"],
    ),
    toggle(
      "k.showShiftLabels",
      "Shift symbols",
      "Show the small symbol above each number key",
      "Keyboard",
      ks.showShiftLabels,
      (v) => setKs({ showShiftLabels: v }),
      ["keyboard", "labels"],
    ),
  ];
}
