"use client";

import { UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";

/** Edit profile's identity-tag toggles: one chip per eligible tag;
 *  shown tags are full colour, hidden ones greyed. Each click saves. */
export function TagPicker({
  eligible,
  selected,
  saving,
  onToggle,
}: {
  eligible: readonly UserTagId[];
  selected: readonly UserTagId[];
  saving: boolean;
  onToggle: (tag: UserTagId) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Your tags</span>
        <span className="text-xs text-muted-foreground">
          {selected.length === 0 ? "None shown" : `${selected.length} shown`}
        </span>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        Tap a chip to toggle whether it appears beside your name.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {eligible.map((t) => {
          const on = selected.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              aria-pressed={on}
              disabled={saving}
              className={cn(
                "inline-flex min-h-11 items-center rounded-pill transition-opacity sm:min-h-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                "disabled:cursor-not-allowed",
                on ? "opacity-100" : "opacity-40 grayscale hover:opacity-70",
              )}
            >
              {/* tooltip={false}: the chip is the visual for the outer
               *  toggle button; a hover tooltip would compete with it. */}
              <UserTag tag={t} size="sm" tooltip={false} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
