"use client";

import { type MistakeStyle, useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { LabelWithDesc, SelectChips } from "../controls";
import { SettingsRow, SwitchRow } from "../row";

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
  { id: "color", label: "Colour", preview: <ChipPreview style="color" /> },
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

/** Mistake treatment rows inside Typing area. The first row carries
 *  the `#mistakes` anchor (it used to be a section of its own). */
export function MistakesRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <>
      <SettingsRow
        id="mistakes"
        label={
          <LabelWithDesc
            title="Mistakes"
            desc="How a wrong letter in the current word is marked."
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
      <SwitchRow
        title="Mark skipped words"
        desc="Underline a word you leave before finishing it."
        checked={prefs.markIncompleteWord}
        onChange={(v) => update("markIncompleteWord", v)}
      />
    </>
  );
}
