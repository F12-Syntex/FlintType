"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
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
    return (
      <SegmentedControl
        value={value}
        onValueChange={onChange}
        ariaLabel={ariaLabel}
        options={options.map((o) => ({ value: o.id, label: o.label }))}
        // Phones: a full-width track with equal segments; from `sm` up
        // it hugs its options beside the label.
        className="w-full max-w-full sm:w-auto [&>button]:flex-1 [&>button]:px-1.5 sm:[&>button]:flex-none sm:[&>button]:px-3"
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
