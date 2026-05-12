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

/** Dropdown picker for the active race mode. Used by the race HUD as a
 *  compact pill at the top of the screen. Trigger shows the active
 *  mode's short name; the dropdown carries the full detail + check
 *  marker per item. Scales to N modes without bloating the chrome. */
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
            "group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5",
            "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground",
            "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "hover:border-foreground/30 hover:bg-accent/40",
          )}
        >
          {mode.name}
          <ChevronDown
            size={12}
            aria-hidden
            className="text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-56">
        {RACE_MODE_ORDER.map((id) => {
          const m = RACE_MODES[id];
          const active = id === modeId;
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => onPick(id)}
              className={cn(
                "flex items-start gap-2.5 py-2.5",
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
                <Check size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.16em]",
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
