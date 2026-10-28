"use client";

import {
  type HighlightMode,
  type QuoteAttribution,
  type TypedEffect,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { LabelWithDesc, SelectChips } from "../controls";
import { SettingsRow } from "../row";
import { LinesRenderedControl, LineWidthControl } from "./layout-controls";

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
            desc="The longest a line can get, in characters, or Full to fill the space."
          />
        }
        control={
          <LineWidthControl
            value={prefs.maxLineWidth}
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
