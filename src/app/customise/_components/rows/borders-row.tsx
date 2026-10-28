"use client";

import { useAppearancePrefs, type BordersMode } from "@/lib/appearance-prefs";
import { Chip, ChipGroup } from "../chip";
import { LabelWithDesc } from "../controls";
import { SettingsRow } from "../row";

/** A small swatch — one per chip — drawn with `box-shadow` instead of
 *  `border` so the global `[data-ft-borders="hidden"]` rule never
 *  collapses these samples. They must always reflect what *that* mode
 *  would do, regardless of what mode is currently active. */
function BorderPreview({ mode, active }: { mode: BordersMode; active: boolean }) {
  const ink = active ? "var(--primary)" : "currentColor";
  const ringByMode: Record<BordersMode, string> = {
    default: `inset 0 0 0 1px ${ink}`,
    soft: `inset 0 0 0 1px color-mix(in oklch, ${ink} 30%, transparent)`,
    hidden: "inset 0 0 0 1px transparent",
  };
  return (
    <span
      aria-hidden
      className="block h-3 w-5 rounded-[2px]"
      style={{ boxShadow: ringByMode[mode] }}
    />
  );
}

const PRESETS: ReadonlyArray<{ id: BordersMode; label: string }> = [
  { id: "default", label: "Strong" },
  { id: "soft", label: "Soft" },
  { id: "hidden", label: "Hidden" },
];

/** Borders row — toggles every hairline in the app via a single
 *  `<html data-ft-borders="…">` switch handled by globals.css. Sits
 *  under Geometry because it changes the geometry of every surface,
 *  not the colour of any one thing. */
export function BordersRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label={
        <LabelWithDesc title="Outlines" desc="The thin lines around cards and controls." />
      }
      control={
        <ChipGroup>
          {PRESETS.map((p) => {
            const active = prefs.borders === p.id;
            return (
              <Chip
                key={p.id}
                label={p.label}
                active={active}
                onClick={() => update("borders", p.id)}
                preview={<BorderPreview mode={p.id} active={active} />}
              />
            );
          })}
        </ChipGroup>
      }
    />
  );
}
