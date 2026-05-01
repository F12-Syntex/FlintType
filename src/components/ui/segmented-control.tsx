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
          "rounded-md border border-ft-line-soft bg-white p-0.5 shadow-[0_1px_0_0_hsl(38_20%_82%)]",
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
              "cursor-pointer rounded font-medium uppercase tracking-[0.12em] transition-colors outline-none",
              "focus-visible:ring-1 focus-visible:ring-ft-ember focus-visible:ring-offset-1 focus-visible:ring-offset-ft-paper",
              size === "sm"
                ? "px-2 py-1 text-[10px]"
                : "px-2.5 py-1.5 text-[11px]",
              active
                ? "bg-ft-ember text-white shadow-sm"
                : "text-ft-dim-2 hover:bg-ft-line-soft hover:text-ft-ink",
            )}
          >
            {item.label ?? String(item.value)}
          </button>
        );
      })}
    </div>
  );
}
