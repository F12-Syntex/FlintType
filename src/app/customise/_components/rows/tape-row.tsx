"use client";

import {
  type TapeFade,
  type TapeMode,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { LabelWithDesc, SelectChips, SliderRow } from "../controls";
import { SettingsRow, SwitchRow } from "../row";

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

/** Fade hint: a solid bar (off) vs a bar masked to dissolve at its ends
 *  (soft / strong) — the same opacity-gradient technique the passage
 *  uses, so the chip reads exactly like the effect it toggles. */
function TapeFadeChipPreview({ level }: { level: TapeFade }) {
  if (level === "off") {
    return <span className="block h-1 w-7 rounded-full bg-foreground/55" />;
  }
  const edge = level === "strong" ? 32 : 16;
  const grad = `linear-gradient(to right, transparent 0%, #000 ${edge}%, #000 ${100 - edge}%, transparent 100%)`;
  return (
    <span
      className="block h-1 w-7 rounded-full bg-foreground/65"
      style={{ maskImage: grad, WebkitMaskImage: grad }}
    />
  );
}

const TAPE_FADE_OPTIONS: readonly {
  id: TapeFade;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <TapeFadeChipPreview level="off" /> },
  { id: "soft", label: "Soft", preview: <TapeFadeChipPreview level="soft" /> },
  {
    id: "strong",
    label: "Strong",
    preview: <TapeFadeChipPreview level="strong" />,
  },
];

/** Tape rows inside Typing area. The first row carries the `#tape`
 *  anchor (it used to be a section of its own); position and fade only
 *  show while tape is on. */
export function TapeRows() {
  const { prefs, update } = useAppearancePrefs();
  const tapeOn = prefs.tapeMode !== "off";

  return (
    <>
      <SettingsRow
        id="tape"
        label={
          <LabelWithDesc
            title="Tape"
            desc="Show one scrolling line instead of a block of text."
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

      {tapeOn ? (
        <>
          <SettingsRow
            label={
              <LabelWithDesc
                title="Caret position"
                desc="Where the caret sits along the line. 50% is the middle."
              />
            }
            control={
              <SliderRow
                value={prefs.tapeMargin}
                min={0}
                max={100}
                step={1}
                ariaLabel="Tape caret position"
                format={(v) => `${v}%`}
                onChange={(v) => update("tapeMargin", v)}
              />
            }
          />

          <SettingsRow
            label={
              <LabelWithDesc
                title="Edge fade"
                desc="Fade the line out toward its ends."
              />
            }
            control={
              <SelectChips
                value={prefs.tapeFade}
                options={TAPE_FADE_OPTIONS}
                onChange={(v) => update("tapeFade", v)}
              />
            }
          />
        </>
      ) : null}

      <SwitchRow
        title="Smooth scrolling"
        desc={
          tapeOn
            ? "Glide the line along instead of jumping."
            : "Glide to the next line instead of jumping."
        }
        checked={prefs.smoothLineScroll}
        onChange={(v) => update("smoothLineScroll", v)}
      />
    </>
  );
}
