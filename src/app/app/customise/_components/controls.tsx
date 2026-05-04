"use client";

import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Chip, ChipGroup } from "./chip";

/** Off / On binary toggle rendered as two chips, so it lines up with
 *  the SelectChips control in the same column. */
export function ToggleChips({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <ChipGroup>
      <Chip label="Off" active={!value} onClick={() => onChange(false)} />
      <Chip label="On" active={value} onClick={() => onChange(true)} />
    </ChipGroup>
  );
}

/** N-way enum picker as chips. The chip labels are the only affordance
 *  so keep `label` short; if it's noisy text, use a Dropdown instead. */
export function SelectChips<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <ChipGroup>
      {options.map((o) => (
        <Chip
          key={String(o.id)}
          label={o.label}
          active={value === o.id}
          onClick={() => onChange(o.id)}
        />
      ))}
    </ChipGroup>
  );
}

/** Numeric slider with a value badge, for continuous prefs (opacity,
 *  tape margin, keymap size, max line width). Stretches to its parent
 *  on mobile (SettingsRow is column-stacked) and caps at 11rem on
 *  sm:+ so it doesn't elbow the label off the row. */
export function SliderRow({
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => ReactNode;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full items-center gap-3 sm:w-44">
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          if (Array.isArray(v) && typeof v[0] === "number") onChange(v[0]);
        }}
        className="flex-1"
      />
      <span className="min-w-10 text-right text-xs tabular-nums text-muted-foreground">
        {format(value)}
      </span>
    </div>
  );
}

/** Build a row label that pairs a short title with an optional
 *  description underneath. Matches the style used by the behaviour
 *  page so labels read uniformly across settings. */
export function LabelWithDesc({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>{title}</span>
      {desc ? (
        <span className="text-xs font-normal text-muted-foreground">
          {desc}
        </span>
      ) : null}
    </span>
  );
}
