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

/** Race-mode dropdown chip. Lives inside the top race strip's first
 *  `<Field label="mode">` slot, mirroring practice's segmented-control
 *  pill height (h-8) so the two surfaces share rhythm.
 *
 *  Chip is a single flat surface (border + bg-background) so the
 *  trigger reads as one control, not a button-within-a-button.
 *  Chevron tilts on open. Hover lifts the border and gently fills
 *  with `bg-accent/40` so the click target is obvious but never
 *  competes with the brand spark.
 *
 *  On mobile the picker is a §10.5 bottom sheet, not a popover — same
 *  trigger, but the list of modes opens from the bottom edge. */
export function ModePicker({
  modeId,
  onPick,
  disabled,
}: {
  modeId: RaceModeId;
  onPick: (id: RaceModeId) => void;
  disabled: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const mode = RACE_MODES[modeId];

  const trigger = (
    <button
      type="button"
      onClick={isMobile ? () => setOpen(true) : undefined}
      disabled={disabled}
      aria-haspopup={isMobile ? "dialog" : undefined}
      aria-expanded={isMobile ? open : undefined}
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
          isMobile
            ? open && "rotate-180"
            : "group-data-[state=open]:rotate-180",
        )}
      />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <MobileSheet open={open} onOpenChange={setOpen} title="Race mode">
          <ul className="flex flex-col">
            {RACE_MODE_ORDER.map((id) => (
              <ModeRow
                key={id}
                id={id}
                active={id === modeId}
                onPick={() => {
                  onPick(id);
                  setOpen(false);
                }}
              />
            ))}
          </ul>
        </MobileSheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {trigger}
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

/** A single mode row inside the mobile bottom sheet. */
function ModeRow({
  id,
  active,
  onPick,
}: {
  id: RaceModeId;
  active: boolean;
  onPick: () => void;
}) {
  const m = RACE_MODES[id];
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-md px-3 py-3 text-left transition-colors",
          active ? "bg-primary/[0.06]" : "hover:bg-accent",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center",
            active ? "text-primary" : "text-transparent",
          )}
        >
          <Check size={14} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div
            className={cn(
              "text-[12px] font-semibold uppercase tracking-[0.14em]",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {m.name}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {m.detail}
          </div>
        </div>
      </button>
    </li>
  );
}
