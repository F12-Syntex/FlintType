"use client";

import { type MistakeStyle, useAppearancePrefs } from "@/lib/appearance-prefs";
import { LabelWithDesc, SelectChips } from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const MISTAKE_STYLE_OPTIONS: readonly { id: MistakeStyle; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "bold", label: "Bold" },
  { id: "underline", label: "Underline" },
  { id: "highlight", label: "Highlight" },
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
