"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A small uppercase preset chip — the canonical control for any
 *  settings row whose choice space is 2–6 short discrete values
 *  (Style, Thickness, Mode, …). See `docs/ui-law.md` §12.2. */
export function Chip({
  label,
  active,
  onClick,
}: {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** Right-aligned wrapper for a row of `<Chip>`s — wraps onto a second
 *  line on narrow viewports without pushing the surrounding row past
 *  its `max-h-48` (3× min) cap. */
export function ChipGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">{children}</div>
  );
}
