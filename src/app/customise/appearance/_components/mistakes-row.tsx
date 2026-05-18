"use client";

import { type MistakeStyle, useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
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
        preview={<MistakeStylePreview style={prefs.mistakeStyle} />}
      />
    </div>
  );
}

/** Inline mini-preview for the Active-mistake row: shows a single
 *  word ("jumps") with the third letter typed wrong (`y` vs `m`),
 *  styled with the user's current mistake style so the effect is
 *  visible without scrolling back to the section preview. */
function MistakeStylePreview({ style }: { style: MistakeStyle }) {
  const errorBg = "color-mix(in oklch, var(--ft-passage-error, var(--destructive)) 20%, transparent)";
  return (
    <span className="inline-flex items-baseline gap-[0.04em] font-mono text-base text-foreground">
      <span>ju</span>
      <span
        className={cn(
          "text-[var(--ft-passage-error,var(--destructive))]",
          style === "bold" && "font-bold",
          style === "underline" &&
            "underline decoration-2 underline-offset-[5px] decoration-[var(--ft-passage-error,var(--destructive))]",
          style === "highlight" && "rounded-sm font-bold",
        )}
        style={
          style === "highlight" ? { backgroundColor: errorBg } : undefined
        }
      >
        y
      </span>
      <span>ps</span>
    </span>
  );
}
