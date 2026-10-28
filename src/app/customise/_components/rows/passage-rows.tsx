"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  type HighlightMode,
  type QuoteAttribution,
  type TypedEffect,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { Chip } from "../chip";
import { LabelWithDesc, SelectChips, SliderRow } from "../controls";
import { SettingsRow } from "../row";

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
  // Remember the last number so the All chip can act as a toggle.
  // Seeded from the current value (or 4, the default); updated whenever
  // the user types a number.
  const [lastN, setLastN] = useState<number>(value > 0 ? value : 4);
  const restoreN = value > 0 ? value : lastN;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={20}
        step={1}
        value={isAll ? "" : String(value)}
        placeholder={String(restoreN)}
        aria-label="Lines shown"
        onChange={(e) => {
          const raw = e.currentTarget.value;
          if (raw === "") return;
          const n = Number.parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          // Clamp into the supported range; All has its own affordance.
          const clamped = Math.min(20, Math.max(1, n));
          setLastN(clamped);
          onChange(clamped);
        }}
        className="h-9 w-[4.5rem] text-right tabular-nums"
      />
      <Chip
        label="All"
        active={isAll}
        onClick={() => {
          if (!isAll) setLastN(value);
          onChange(isAll ? restoreN : 0);
        }}
      />
    </div>
  );
}

/** Highlight + typed-word treatment — the first rows of Typing area. */
export function HighlightRows() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <>
      <SettingsRow
        label={
          <LabelWithDesc
            title="Highlight"
            desc="What gets marked as you move through the text."
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
            title="Typed words"
            desc="How words look once you've typed them."
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
    </>
  );
}

const QUOTE_ATTRIBUTION_OPTIONS: readonly {
  id: QuoteAttribution;
  label: string;
}[] = [
  { id: "below", label: "Below" },
  { id: "chip", label: "Badge" },
  { id: "hidden", label: "Hidden" },
];

/** How much text shows, how wide it runs, and the quote credit. */
export function LayoutRows() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <>
      <SettingsRow
        inline
        label={
          <LabelWithDesc
            title="Lines shown"
            desc="Pick a number, or All to fill the space."
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
            title="Line width"
            desc="The longest a line can get, in characters. 0 uses the full width."
          />
        }
        control={
          <SliderRow
            value={prefs.maxLineWidth}
            min={0}
            max={200}
            step={5}
            ariaLabel="Line width"
            format={(v) => (v === 0 ? "Full" : `${v} ch`)}
            onChange={(v) => update("maxLineWidth", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Quote credit"
            desc="Where the author shows in quote mode."
          />
        }
        control={
          <SelectChips
            ariaLabel="Quote credit"
            value={prefs.quoteAttribution}
            options={QUOTE_ATTRIBUTION_OPTIONS}
            onChange={(v) => update("quoteAttribution", v)}
          />
        }
      />
    </>
  );
}
