"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { blurAfterPointerClick, SEGMENT_TRACK, segmentClass } from "./mode-segment";

export type LengthPreset = { value: number; label: string };

const CUSTOM_LIMITS = { min: 1, max: 1000 };

/** Length presets for the practice mode bar plus an optional "Custom"
 *  pill that swaps for an inline number input on click. Renders exactly
 *  like the shared segmented switch (orange brand pill when selected);
 *  it isn't a `<SegmentedControl>` only because one item has to morph
 *  into an input on demand.
 *
 *  - `framed` wraps the pills in the switch track (mobile stack); off,
 *    they float inside the desktop toolbar capsule.
 *  - `fill` stretches the pills across the row (mobile, so the row
 *    never overflows 375px). */
export function LengthPicker({
  presets,
  value,
  onChange,
  allowCustom,
  ariaLabel,
  framed = false,
  fill = false,
  className,
}: {
  presets: ReadonlyArray<LengthPreset>;
  value: number;
  onChange: (next: number) => void;
  allowCustom: boolean;
  ariaLabel: string;
  framed?: boolean;
  fill?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isPreset = presets.some((p) => p.value === value);
  const customSelected = allowCustom && !isPreset;

  const apply = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) {
      onChange(Math.max(CUSTOM_LIMITS.min, Math.min(CUSTOM_LIMITS.max, n)));
    }
    setEditing(false);
    setDraft("");
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const item = fill ? "flex-1 px-2" : undefined;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        framed ? SEGMENT_TRACK : "inline-flex items-center gap-0.5",
        fill && "flex w-full",
        className,
      )}
    >
      {presets.map((p) => {
        const active = value === p.value && !editing;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              cancel();
              onChange(p.value);
              blurAfterPointerClick(e);
            }}
            className={segmentClass(active, item)}
          >
            {p.label}
          </button>
        );
      })}
      {allowCustom ? (
        editing ? (
          <input
            type="number"
            inputMode="numeric"
            min={CUSTOM_LIMITS.min}
            max={CUSTOM_LIMITS.max}
            placeholder={String(value)}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            aria-label="Custom length"
            className={cn(
              // Same footprint as a selected pill: the input reads as the
              // active segment while you type into it.
              "h-8 w-16 rounded-pill border border-primary/50 bg-background px-3 text-center text-[13px] font-medium tabular-nums text-foreground outline-none",
              "[appearance:textfield] focus-visible:ring-2 focus-visible:ring-ring/40",
              "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              fill && "flex-1",
            )}
          />
        ) : (
          <button
            type="button"
            role="radio"
            aria-checked={customSelected}
            aria-label={customSelected ? `Custom length, ${value}` : "Custom length"}
            onClick={() => {
              setDraft(customSelected ? String(value) : "");
              setEditing(true);
            }}
            className={segmentClass(customSelected, cn(item, "tabular-nums"))}
          >
            {customSelected ? String(value) : "Custom"}
          </button>
        )
      ) : null}
    </div>
  );
}
