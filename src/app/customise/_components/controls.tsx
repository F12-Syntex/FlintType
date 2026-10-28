"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Chip, ChipGroup } from "./chip";

/** N-way enum picker for a settings row.
 *
 *  - Text-only options render as the shared segmented switch (§17.2 /
 *    §21): a pill track with the selected option as a filled brand
 *    pill. Keep labels short.
 *  - Options that carry a `preview` render as visual chips — a small
 *    sample above each label — so the user compares what each option
 *    does before picking (§12.2a). Every option in a row has a preview
 *    or none does. */
export function SelectChips<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: readonly { id: T; label: string; preview?: ReactNode }[];
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  const visual = options.some((o) => o.preview != null);
  if (!visual) {
    // Six or more word labels (caret Movement) don't fit a phone row at
    // 13px: the short ones shrank to tight pills around their text.
    // Dense rows drop to 12px with slimmer padding on phones, so the
    // equal-share segments (`flex-1`) all fit and every pill gets the
    // same breathing room. Digit rows (Shortest word) already fit.
    const dense =
      options.length >= 6 && options.some((o) => o.label.length > 2);
    return (
      <SegmentedControl
        value={value}
        onValueChange={onChange}
        ariaLabel={ariaLabel}
        options={options.map((o) => ({ value: o.id, label: o.label }))}
        // Phones: a full-width track with equal, 40px-tall segments (a
        // 48px target with the track's padding); from `sm` up it hugs
        // its options beside the label at the compact height.
        className={cn(
          "w-full max-w-full sm:w-auto [&>button]:min-h-10 [&>button]:flex-1 [&>button]:px-1.5 sm:[&>button]:min-h-0 sm:[&>button]:flex-none sm:[&>button]:px-3",
          dense &&
            "max-sm:[&>button]:px-1 max-sm:[&>button]:text-xs",
          // Below the 375px baseline even that wraps one pill onto its
          // own line, so narrow phones get two even rows instead.
          dense &&
            "max-[374px]:grid max-[374px]:grid-cols-3 max-[374px]:rounded-3xl",
        )}
      />
    );
  }
  return (
    <ChipGroup>
      {options.map((o) => (
        <Chip
          key={String(o.id)}
          label={o.label}
          active={value === o.id}
          onClick={() => onChange(o.id)}
          preview={o.preview}
        />
      ))}
    </ChipGroup>
  );
}

/** Numeric slider with a value readout, for continuous prefs (opacity,
 *  tape margin, keymap size, max line width). Full width on phones
 *  (the row stacks there), a fixed 12rem from `sm` up. */
export function SliderRow({
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => ReactNode;
  onChange: (v: number) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3 sm:w-52">
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onValueChange={(v) => {
          if (Array.isArray(v) && typeof v[0] === "number") onChange(v[0]);
        }}
        className="flex-1"
      />
      <span className="min-w-12 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {format(value)}
      </span>
    </div>
  );
}

/** A row label: a short title with an optional one-line description
 *  underneath. */
export function LabelWithDesc({
  title,
  desc,
}: {
  title: ReactNode;
  desc?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{title}</span>
      {desc ? (
        <span className="text-[13px] leading-snug font-normal text-muted-foreground">
          {desc}
        </span>
      ) : null}
    </span>
  );
}
