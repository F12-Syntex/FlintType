"use client";

import { type MistakeStyle, useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { LabelWithDesc, SelectChips } from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

/** Per-chip preview: a single "wrong" letter ("y") rendered in that
 *  option's variant so the user can compare all four styles at a
 *  glance before picking. Matches the live treatment the practice
 *  surface uses for active-word mistakes. */
function ChipPreview({ style }: { style: MistakeStyle }) {
  const errorBg =
    "color-mix(in oklch, var(--ft-passage-error, var(--destructive)) 20%, transparent)";
  return (
    <span className="block font-mono text-sm leading-none">
      <span
        className={cn(
          "text-[var(--ft-passage-error,var(--destructive))]",
          style === "bold" && "font-bold",
          style === "underline" &&
            "underline decoration-2 underline-offset-[3px] decoration-[var(--ft-passage-error,var(--destructive))]",
          style === "highlight" && "rounded-sm font-bold px-0.5",
        )}
        style={
          style === "highlight" ? { backgroundColor: errorBg } : undefined
        }
      >
        y
      </span>
    </span>
  );
}

const MISTAKE_STYLE_OPTIONS: readonly {
  id: MistakeStyle;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "color", label: "Color", preview: <ChipPreview style="color" /> },
  { id: "bold", label: "Bold", preview: <ChipPreview style="bold" /> },
  {
    id: "underline",
    label: "Underline",
    preview: <ChipPreview style="underline" />,
  },
  {
    id: "highlight",
    label: "Highlight",
    preview: <ChipPreview style="highlight" />,
  },
];

export function MistakesRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Active mistake"
            desc="How a mistyped letter in the current word is marked. Color paints the letter in your error colour and stops there; Bold adds weight; Underline draws a line under the glyph; Highlight fills the cell. The error colour itself lives under Colors → Practice text (error)."
          />
        }
        control={
          <SelectChips
            value={prefs.mistakeStyle}
            options={MISTAKE_STYLE_OPTIONS}
            onChange={(v) => update("mistakeStyle", v)}
          />
        }
      />
    </div>
  );
}
