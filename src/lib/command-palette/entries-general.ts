import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
import { enumEntry } from "./entry-helpers";
import type { CommandEntry } from "./types";

/** The id the palette entry uses for the Default palette, which the
 *  palette store records as `activeId: null`. */
export const DEFAULT_PALETTE_OPTION = "default";

type Mode = "light" | "dark" | "system";

/** Restart, light/dark mode and the colour palette — the entries that
 *  head the list. */
export function generalEntries({
  mode,
  setMode,
  paletteId,
  themes,
  applyPalette,
  resetPalette,
}: {
  mode: string | undefined;
  setMode: (next: Mode) => void;
  /** The active palette id; null is the Default palette. */
  paletteId: string | null;
  themes: readonly { id: string; name: string }[];
  applyPalette: (id: string) => void;
  resetPalette: () => void;
}): CommandEntry[] {
  // Mirror the Settings → Theme picker: Default first (a reset, not a
  // registry theme), then every palette, plus "Custom" while the user
  // is on a hand-tuned fork so the current value has a label.
  const paletteOptions = [
    { id: DEFAULT_PALETTE_OPTION, label: "Default" },
    ...(paletteId === CUSTOM_THEME_ID
      ? [{ id: CUSTOM_THEME_ID, label: "Custom" }]
      : []),
    ...themes.map((t) => ({ id: t.id, label: t.name })),
  ];

  return [
    {
      id: "p.restart",
      label: "Restart test",
      hint: "Start a fresh run with the same mode and length",
      group: "Practice",
      kind: "action",
      // Dispatched on a global channel; the practice surface subscribes
      // and runs restart(). No-op on routes without one — harmless.
      run: () => {
        window.dispatchEvent(new CustomEvent("ft:practice:restart"));
      },
      keywords: ["reset", "tab", "again", "retry", "redo"],
    },
    enumEntry(
      "mode",
      "Mode",
      "Light, dark, or follow your device",
      "Mode",
      (mode ?? "system") as Mode,
      [
        { id: "system", label: "System" },
        { id: "light", label: "Light" },
        { id: "dark", label: "Dark" },
      ] as const,
      (next) => setMode(next),
      ["theme", "appearance", "light", "dark", "system"],
    ),
    enumEntry(
      "palette",
      "Palette",
      "The colours used across the whole app",
      "Theme",
      paletteId ?? DEFAULT_PALETTE_OPTION,
      paletteOptions,
      (next) => {
        // Re-picking the current palette would still clear the
        // theme-owned overrides, so it's a no-op (as in Settings).
        if (next === (paletteId ?? DEFAULT_PALETTE_OPTION)) return;
        if (next === DEFAULT_PALETTE_OPTION) resetPalette();
        else applyPalette(next);
      },
      ["theme", "palette", "colours", "colors"],
    ),
  ];
}
