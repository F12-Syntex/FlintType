"use client";

import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One option in a visual choice row (ui-law §12.2a): a small sample of
 *  what the option does stacked over its label, so the user picks by
 *  comparison. Text-only choices don't use this — they render as the
 *  shared segmented switch (see `SelectChips`).
 *
 *  A pill like every other control (`rounded-pill`, so the Style →
 *  Buttons setting reshapes it too). Selected = the brand orange
 *  (tinted fill + orange hairline + orange label); at rest it's a quiet
 *  muted pill. The border is always present (transparent at rest) so
 *  selecting never shifts layout. */
export function Chip({
  label,
  preview,
  active,
  onClick,
}: {
  label: ReactNode;
  preview?: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center border text-[13px] font-medium transition-[color,background-color,border-color] duration-200 outline-none sm:min-h-9",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        preview
          ? "min-w-0 flex-col gap-1.5 rounded-pill px-2 py-2 text-xs sm:min-w-18 sm:px-4"
          : "rounded-pill px-3.5 py-1.5",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {preview ? (
        <span className="flex min-h-5 items-center justify-center">
          {preview}
        </span>
      ) : null}
      <span className="leading-none">{label}</span>
    </button>
  );
}

/** Phone grid by option count, so every row of tiles fills the width:
 *  up to four options share one row; five or more sit in rows of three
 *  on a six-column grid, and a short last row stretches its tiles
 *  (5 → 3 + 2, 7 → 3 + 3 + 1) instead of leaving an empty cell. */
function mobileGrid(count: number): string {
  if (count <= 4) {
    return (
      ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"][
        count
      ] ?? "grid-cols-4"
    );
  }
  const rest = count % 3;
  return cn(
    "grid-cols-6 [&>*]:col-span-2",
    rest === 2 && "[&>*:nth-last-child(-n+2)]:col-span-3",
    rest === 1 && "[&>*:last-child]:col-span-6",
  );
}

/** Wrapper for a row of `<Chip>`s. On phones it's an even grid (equal
 *  tiles, so a wrapped row never leaves a ragged gap); from `sm` up the
 *  chips sit right-aligned beside the label. */
export function ChipGroup({ children }: { children: ReactNode }) {
  const count = Children.count(children);
  return (
    <div
      className={cn(
        "grid w-full gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-end",
        mobileGrid(count),
      )}
    >
      {children}
    </div>
  );
}
