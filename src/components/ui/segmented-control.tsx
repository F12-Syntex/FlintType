"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** A "pick one from these N options" segmented selector. The visual is
 *  the established practice mode-bar pill row: framed white shell,
 *  hairline border, ember-active pill, hover-tint inactive pills. Use
 *  it anywhere the choice space is small and worth showing inline (vs.
 *  a dropdown). */

export type SegmentedControlOption<T extends string | number> = {
  value: T;
  label?: React.ReactNode;
};

type Option<T extends string | number> = T | SegmentedControlOption<T>;

export interface SegmentedControlProps<T extends string | number> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly Option<T>[];
  /** Pill density. `md` matches the practice mode-bar; `sm` is for
   *  inline use inside dense tables / setting rows. */
  size?: "sm" | "md";
  /** Wrap the pills in the framed white shell with a hairline border
   *  and inner padding. Set false to drop the shell so the pills float
   *  in whatever parent surface the caller already provides. Default
   *  true. */
  framed?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  value,
  onValueChange,
  options,
  size = "md",
  framed = true,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-0.5",
        framed &&
          "rounded-pill border border-border bg-muted/70 p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const item: SegmentedControlOption<T> =
          typeof opt === "object" ? opt : { value: opt };
        const active = item.value === value;
        return (
          <button
            key={String(item.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              onValueChange(item.value);
              // Drop focus after selection so the focus ring doesn't
              // linger on the previously-clicked pill.
              e.currentTarget.blur();
            }}
            className={cn(
              "cursor-pointer rounded-pill font-medium transition-[color,background-color,box-shadow] duration-200 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              size === "sm"
                ? "px-2.5 py-1 text-xs"
                : "px-3 py-1.5 text-[13px]",
              active
                ? "brand-surface text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label ?? String(item.value)}
          </button>
        );
      })}
    </div>
  );
}
