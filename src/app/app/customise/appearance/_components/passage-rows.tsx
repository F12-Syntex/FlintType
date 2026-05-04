"use client";

import {
  type HighlightMode,
  type TapeMode,
  type TypedEffect,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
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
            title="Show all lines"
            desc="Show every line of word/custom/quote tests instead of capping at 3."
          />
        }
        control={
          <ToggleChips
            value={prefs.showAllLines}
            onChange={(v) => update("showAllLines", v)}
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
