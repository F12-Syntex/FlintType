"use client";

import { cn } from "@/lib/utils";

/** A row-major grid of cells representing a drill's progression.
 *  Cells split into three states:
 *
 *    done    — cleared work, lit in primary at full alpha
 *    active  — the cell the user is currently working on, ember-pulse
 *    todo    — upcoming, hairline outline only
 *
 *  The grid is purely presentational; the engine decides the cell
 *  count and the active index. Used by sudden-death (one cell per
 *  word in the passage) and burst-game (one cell per rep × word). */
export function StreakGrid({
  total,
  done,
  active,
  cellsPerRow = 10,
  /** When the engine wants to telegraph "you just lost the streak",
   *  flashing the grid red for a beat reads better than cells
   *  silently emptying. Pulsed-on by sudden-death after a mistake. */
  failed = false,
  className,
}: {
  total: number;
  done: number;
  active?: number | null;
  cellsPerRow?: number;
  failed?: boolean;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className={cn(
        "grid gap-1.5",
        failed && "ft-streak-fail",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${cellsPerRow}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const state =
          i < done ? "done" : i === active ? "active" : "todo";
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "h-2.5 rounded-sm transition-colors duration-150",
              state === "done" &&
                "bg-primary",
              state === "active" &&
                "bg-primary/40 ring-1 ring-primary",
              state === "todo" &&
                "bg-muted/30 border border-foreground/10",
              failed && state === "done" && "bg-destructive/70",
            )}
          />
        );
      })}
    </div>
  );
}
