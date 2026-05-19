"use client";

import { type TapeMode, useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

/** Tape mode visual hint for the chip row:
 *    off    — stacked block of lines (the default multi-line passage)
 *    word   — single horizontal line, one chunk lit (per-word scroll)
 *    letter — single horizontal line, fine-grained ticks (per-keypress scroll) */
function TapeChipPreview({ mode }: { mode: TapeMode }) {
  if (mode === "off") {
    return (
      <span className="flex flex-col items-center gap-0.5">
        <span className="block h-0.5 w-6 bg-foreground/40" />
        <span className="block h-0.5 w-5 bg-foreground/40" />
        <span className="block h-0.5 w-4 bg-foreground/40" />
      </span>
    );
  }
  if (mode === "word") {
    return (
      <span className="flex items-center gap-0.5">
        <span className="block h-0.5 w-2.5 bg-primary/60" />
        <span className="block h-0.5 w-2.5 bg-foreground/40" />
        <span className="block h-0.5 w-2.5 bg-foreground/40" />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-px">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "block h-0.5 w-1",
            i === 2 ? "bg-primary/80" : "bg-foreground/35",
          )}
        />
      ))}
    </span>
  );
}

const TAPE_OPTIONS: readonly {
  id: TapeMode;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <TapeChipPreview mode="off" /> },
  { id: "word", label: "Word", preview: <TapeChipPreview mode="word" /> },
  {
    id: "letter",
    label: "Letter",
    preview: <TapeChipPreview mode="letter" />,
  },
];

export function TapeRows() {
  const { prefs, update } = useAppearancePrefs();
  const tapeOff = prefs.tapeMode === "off";

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Tape mode"
            desc="One scrolling line. Word scrolls per word, Letter scrolls per keypress. Best with smooth scroll + a mono font."
          />
        }
        control={
          <SelectChips
            value={prefs.tapeMode}
            options={TAPE_OPTIONS}
            onChange={(v) => update("tapeMode", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Tape margin"
            desc="Caret position from the left edge of the typing test (50% centers it). Has no effect when tape mode is off."
          />
        }
        control={
          <SliderRow
            value={prefs.tapeMargin}
            min={0}
            max={100}
            step={1}
            format={(v) => `${v}%`}
            onChange={(v) => update("tapeMargin", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Smooth scroll"
            desc={
              tapeOff
                ? "Animate line transitions in the stacked passage. Especially useful in tape mode."
                : "Animate the horizontal tape so it glides rather than jumping per word / keystroke."
            }
          />
        }
        control={
          <ToggleChips
            value={prefs.smoothLineScroll}
            onChange={(v) => update("smoothLineScroll", v)}
          />
        }
      />
    </div>
  );
}
