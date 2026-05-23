"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RACE_MODES, RACE_MODE_ORDER, type RaceModeId } from "./race-data";

/** Race-mode dropdown chip. Lives inside the top race strip's first
 *  `<Field label="mode">` slot, mirroring practice's segmented-control
 *  pill height (h-8) so the two surfaces share rhythm.
 *
 *  Chip is a single flat surface (border + bg-background) so the
 *  trigger reads as one control, not a button-within-a-button.
 *  Chevron tilts on open. Hover lifts the border and gently fills
 *  with `bg-accent/40` so the click target is obvious but never
 *  competes with the brand spark. */
export function ModePicker({
  modeId,
  onPick,
  disabled,
}: {
  modeId: RaceModeId;
  onPick: (id: RaceModeId) => void;
  disabled: boolean;
}) {
  const mode = RACE_MODES[modeId];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`Race mode — ${mode.name}, ${mode.detail}`}
          className={cn(
            "group inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3",
            "text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground",
            "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            disabled
              ? "cursor-not-allowed opacity-40"
              : "hover:border-foreground/40 hover:bg-accent",
          )}
        >
          <span>{mode.name}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
            {mode.detail.split(" · ")[0] ?? ""}
          </span>
          <ChevronDown
            size={11}
            aria-hidden
            className={cn(
              "ml-0.5 text-muted-foreground transition-transform duration-150",
              "group-data-[state=open]:rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-60 p-1"
      >
        {RACE_MODE_ORDER.map((id) => {
          const m = RACE_MODES[id];
          const active = id === modeId;
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => onPick(id)}
              className={cn(
                "flex items-start gap-2.5 rounded-sm py-2 pl-2 pr-3",
                active && "bg-primary/[0.06]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center",
                  active ? "text-primary" : "text-transparent",
                )}
              >
                <Check size={13} strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.14em]",
                    active ? "text-primary" : "text-foreground",
                  )}
                >
                  {m.name}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {m.detail}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
