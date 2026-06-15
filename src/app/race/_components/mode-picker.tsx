"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { RACE_MODES, RACE_MODE_ORDER, type RaceModeId } from "./race-data";

/** Race-mode picker chip. Lives inside the top race strip's first
 *  `<Field label="mode">` slot, mirroring practice's segmented-control
 *  pill height (h-8) so the two surfaces share rhythm.
 *
 *  Chip is a single flat surface (border + bg-background) so the
 *  trigger reads as one control, not a button-within-a-button.
 *  Chevron tilts on open. Hover lifts the border and gently fills
 *  with `bg-accent` so the click target is obvious but never competes
 *  with the brand spark.
 *
 *  On mobile it opens a bottom sheet rather than a popover (ui-law
 *  §10.5); the desktop popover stays a `<DropdownMenu>`. */
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const chipClass = cn(
    "group inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3",
    "text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground",
    "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    disabled
      ? "cursor-not-allowed opacity-40"
      : "hover:border-foreground/40 hover:bg-accent",
  );

  // Static chip content shared by both triggers (the chevron's open-state
  // rotation differs per branch, so it's appended per trigger).
  const chipLabel = (
    <>
      <span>{mode.name}</span>
      <span aria-hidden className="h-3 w-px bg-border" />
      <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
        {mode.detail.split(" · ")[0] ?? ""}
      </span>
    </>
  );
  const ariaLabel = `Race mode — ${mode.name}, ${mode.detail}`;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={chipClass}
        >
          {chipLabel}
          <ChevronDown
            size={11}
            aria-hidden
            className={cn(
              "ml-0.5 text-muted-foreground transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
        <MobileSheet open={open} onOpenChange={setOpen} title="Race mode">
          <ul className="flex flex-col p-1">
            {RACE_MODE_ORDER.map((id) => {
              const m = RACE_MODES[id];
              const active = id === modeId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-sm px-4 py-3 text-left transition-colors hover:bg-accent",
                      active && "bg-primary/[0.06]",
                    )}
                  >
                    <ModeRowInner m={m} active={active} />
                  </button>
                </li>
              );
            })}
          </ul>
        </MobileSheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" aria-label={ariaLabel} className={chipClass}>
          {chipLabel}
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
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-60 p-1">
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
              <ModeRowInner m={m} active={active} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shared option-row content (coral check + name + detail) so the
 *  desktop dropdown item and the mobile sheet row never drift. */
function ModeRowInner({
  m,
  active,
}: {
  m: (typeof RACE_MODES)[RaceModeId];
  active: boolean;
}) {
  return (
    <>
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
    </>
  );
}
