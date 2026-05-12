"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  type HighlightMode,
  type TapeMode,
  type TypedEffect,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { Chip } from "../../_components/chip";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const HIGHLIGHT_OPTIONS: readonly { id: HighlightMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "letter", label: "Letter" },
  { id: "word", label: "Word" },
  { id: "next-word", label: "Next word" },
  { id: "next-letter", label: "Next letter" },
];

const TYPED_EFFECT_OPTIONS: readonly { id: TypedEffect; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "fade", label: "Fade" },
  { id: "strike", label: "Strike" },
];

const TAPE_OPTIONS: readonly { id: TapeMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "word", label: "Word" },
  { id: "letter", label: "Letter" },
];

/** Numeric input for `linesRendered` paired with an All chip. `0` is
 *  the wire value for unbounded. Range 1–20 — past that you almost
 *  always want All. The most-recent numeric value is remembered so
 *  toggling All on and off again restores it instead of forcing a
 *  retype. */
function LinesRenderedControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const isAll = value === 0;
  // Stash the last numeric value so the All chip can act as a toggle.
  // Seeded with 3 to match the default; updated whenever the user types
  // something else.
  const lastNRef = useRef<number>(value > 0 ? value : 3);
  if (value > 0) lastNRef.current = value;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={20}
        step={1}
        value={isAll ? "" : String(value)}
        placeholder={String(lastNRef.current)}
        aria-label="Lines rendered"
        onChange={(e) => {
          const raw = e.currentTarget.value;
          if (raw === "") return;
          const n = Number.parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          // Clamp into the supported range; All has its own affordance.
          const clamped = Math.min(20, Math.max(1, n));
          onChange(clamped);
        }}
        className="h-8 w-16 text-right tabular-nums"
      />
      <Chip
        label="All"
        active={isAll}
        onClick={() => onChange(isAll ? lastNRef.current : 0)}
      />
    </div>
  );
}

export function PassageRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Highlight mode"
            desc="What gets highlighted as you type."
          />
        }
        control={
          <SelectChips
            value={prefs.highlightMode}
            options={HIGHLIGHT_OPTIONS}
            onChange={(v) => update("highlightMode", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Typed effect"
            desc="How typed words are shown."
          />
        }
        control={
          <SelectChips
            value={prefs.typedEffect}
            options={TYPED_EFFECT_OPTIONS}
            onChange={(v) => update("typedEffect", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Mark incomplete words"
            desc="Underline a word in red when you press space before finishing it. Off keeps the passage quiet — accuracy still counts the skip."
          />
        }
        control={
          <ToggleChips
            value={prefs.markIncompleteWord}
            onChange={(v) => update("markIncompleteWord", v)}
          />
        }
      />

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
            desc="Caret position from the left edge of the typing test (50% centers it)."
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
            title="Smooth line scroll"
            desc="Animate line transitions instead of jumping."
          />
        }
        control={
          <ToggleChips
            value={prefs.smoothLineScroll}
            onChange={(v) => update("smoothLineScroll", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Lines rendered"
            desc="How many lines of the passage are visible at once. Pick a number, or All to fill the available height."
          />
        }
        control={
          <LinesRenderedControl
            value={prefs.linesRendered}
            onChange={(v) => update("linesRendered", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Max line width"
            desc="Maximum width of the typing test in characters. 0 aligns words to the content edges."
          />
        }
        control={
          <SliderRow
            value={prefs.maxLineWidth}
            min={0}
            max={200}
            step={5}
            format={(v) => (v === 0 ? "0" : String(v))}
            onChange={(v) => update("maxLineWidth", v)}
          />
        }
      />
    </div>
  );
}
