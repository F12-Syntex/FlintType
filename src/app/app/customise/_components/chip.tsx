"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A small uppercase preset chip — the canonical control for any
 *  settings row whose choice space is 2–6 short discrete values
 *  (Style, Thickness, Mode, …). See `docs/ui-law.md` §12.2.
 *
 *  Pass `preview` whenever the value is visual (a radius shape, a
 *  caret variant, a colour swatch). The chip stacks the preview above
 *  the text label; without a preview it's a flat text chip. */
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
        "flex min-h-9 flex-col items-center justify-center gap-1 rounded-md border font-semibold uppercase tracking-wider transition-colors",
        preview
          ? "px-3 py-2 text-[11px] sm:px-2 sm:py-1.5 sm:text-[10px]"
          : "px-3 py-2 text-xs sm:px-2.5 sm:py-1 sm:text-[11px]",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {preview ? (
        <span className="flex items-center justify-center">{preview}</span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}

/** Right-aligned wrapper for a row of `<Chip>`s — wraps onto a second
 *  line on narrow viewports without pushing the surrounding row past
 *  its `max-h-48` (3× min) cap. */
export function ChipGroup({ children }: { children: ReactNode }) {
  // Mobile: chips align left under the stacked label and wrap freely
  // across the full row. From `sm:` up the row goes inline with the
  // label on the left, so chips line up to the right edge.
  return (
    <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
      {children}
    </div>
  );
}
