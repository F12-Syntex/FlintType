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

// A keyboard pick that remounts the control (a page that renders a
// different view per choice) would drop focus on <body>. The new
// instance takes it back on mount when its label and value match.
let pendingFocus: { label: string; value: string; at: number } | null = null;

function handOffFocus(label: string, value: string) {
  pendingFocus = { label, value, at: Date.now() };
}

function takeFocusHandOff(label: string, value: string): boolean {
  const p = pendingFocus;
  if (!p || p.label !== label) return false;
  pendingFocus = null;
  return p.value === value && Date.now() - p.at < 1000;
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
  const items: SegmentedControlOption<T>[] = options.map((opt) =>
    typeof opt === "object" ? opt : { value: opt },
  );
  const activeIndex = items.findIndex((item) => item.value === value);
  // Roving tab stop (ARIA radio group): one Tab stop for the group, on
  // the selected option (or the first when none is selected).
  const tabStop = activeIndex === -1 ? 0 : activeIndex;
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ariaLabel || !takeFocusHandOff(ariaLabel, String(value))) return;
    if (groupRef.current?.contains(document.activeElement)) return;
    groupRef.current
      ?.querySelector<HTMLButtonElement>("button[aria-checked='true']")
      ?.focus();
    // Mount-only: this is a hand-off from the instance that unmounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrow keys move the selection, wrapping at the ends; Home / End
  // jump to the first / last option.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = items.length - 1;
    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = tabStop >= last ? 0 : tabStop + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = tabStop <= 0 ? last : tabStop - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button[role='radio']",
    );
    buttons[next]?.focus();
    if (ariaLabel) handOffFocus(ariaLabel, String(items[next].value));
    onValueChange(items[next].value);
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex flex-wrap items-center gap-0.5",
        framed &&
          "rounded-pill border border-border bg-muted/70 p-1",
        className,
      )}
    >
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={String(item.value)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={(e) => {
              onValueChange(item.value);
              // Drop focus after a pointer click so the focus ring
              // doesn't linger on the clicked pill. Keyboard activation
              // (detail 0) keeps focus where the user is.
              if (e.detail > 0) e.currentTarget.blur();
            }}
            className={cn(
              "cursor-pointer rounded-pill font-medium transition-[color,background-color,box-shadow] duration-200 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/40",
              size === "sm"
                ? "px-2.5 py-1 text-xs"
                : "px-3 py-1.5 text-[13px]",
              active
                ? "brand-surface text-primary-foreground"
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
