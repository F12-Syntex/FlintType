"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  type HighlightMode,
  type TapeMode,
  type TypedEffect,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { Chip } from "../../_components/chip";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

/* ─── Per-chip preview primitives ───────────────────────────────── */

function HighlightChipPreview({ mode }: { mode: HighlightMode }) {
  // Tiny three-word slice; the active span is "the". Each mode
  // paints its own emphasis so the user can compare modes at a
  // glance before picking.
  const wordRing = mode === "word" || mode === "next-word";
  const letterRing = mode === "letter" || mode === "next-letter";
  return (
    <span className="block font-mono text-[11px] leading-none">
      <span className="text-muted-foreground">a </span>
      <span
        className={cn(
          wordRing &&
            "rounded-sm bg-primary/15 px-0.5 ring-1 ring-primary/30",
        )}
      >
        {letterRing ? (
          <>
            <span className="rounded-sm bg-primary/15 px-0.5 text-primary">
              t
            </span>
            <span>he</span>
          </>
        ) : (
          "the"
        )}
      </span>
    </span>
  );
}

function TypedEffectChipPreview({ effect }: { effect: TypedEffect }) {
  return (
    <span
      className={cn(
        "block font-mono text-[11px] leading-none text-primary",
        effect === "fade" && "opacity-40",
        effect === "strike" && "line-through decoration-1 opacity-70",
      )}
    >
      typed
    </span>
  );
}

function TapeChipPreview({ mode }: { mode: TapeMode }) {
  // Mode is "where the cursor sits" — off = stacked block, word =
  // single line scrolled per-word, letter = single line scrolled per
  // keystroke. We show stacked dashes (off) vs a single dash row.
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

const HIGHLIGHT_OPTIONS: readonly {
  id: HighlightMode;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <HighlightChipPreview mode="off" /> },
  {
    id: "letter",
    label: "Letter",
    preview: <HighlightChipPreview mode="letter" />,
  },
  { id: "word", label: "Word", preview: <HighlightChipPreview mode="word" /> },
  {
    id: "next-word",
    label: "Next word",
    preview: <HighlightChipPreview mode="next-word" />,
  },
  {
    id: "next-letter",
    label: "Next letter",
    preview: <HighlightChipPreview mode="next-letter" />,
  },
];

const TYPED_EFFECT_OPTIONS: readonly {
  id: TypedEffect;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <TypedEffectChipPreview effect="off" /> },
  {
    id: "fade",
    label: "Fade",
    preview: <TypedEffectChipPreview effect="fade" />,
  },
  {
    id: "strike",
    label: "Strike",
    preview: <TypedEffectChipPreview effect="strike" />,
  },
];

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
            offPreview={<IncompleteChipPreview on={false} />}
            onPreview={<IncompleteChipPreview on={true} />}
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

/* ─── Per-chip preview for Mark incomplete (off / on) ─────────── */

function IncompleteChipPreview({ on }: { on: boolean }) {
  return (
    <span className="block font-mono text-[11px] leading-none">
      <span
        className={cn(
          "text-primary",
          on &&
            "underline decoration-1 underline-offset-[3px] decoration-[var(--ft-passage-error,var(--destructive))]",
        )}
      >
        qu
      </span>
    </span>
  );
}
