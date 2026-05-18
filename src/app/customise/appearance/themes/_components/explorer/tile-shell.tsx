import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tile shell — bordered card with the rendered preview on top and a
 *  hairline-divided footer band below carrying the theme name and the
 *  active-state chip. Keeps the name attached to the tile (instead of
 *  floating below it) so each card reads as one unit; hover reveals a
 *  quiet "→" arrow on inactive tiles to telegraph the click affordance.
 */
export function TileShell({
  active,
  onPick,
  ariaLabel,
  children,
  name,
  accentName = false,
}: {
  active: boolean;
  onPick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  name: string;
  /** Paint the name in primary instead of foreground — used by the
   *  Reactive tile so its name carries the brand spark while every
   *  static theme keeps the neutral label. */
  accentName?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "group relative block w-full overflow-hidden rounded-md border text-left transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-foreground/30 hover:shadow-md",
      )}
    >
      {children}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2.5">
        <span
          className={cn(
            "truncate text-[12px] font-semibold uppercase tracking-[0.16em]",
            accentName ? "text-primary" : "text-foreground",
          )}
        >
          {name}
        </span>
        {active ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            Active
          </span>
        ) : (
          <ArrowRight
            size={14}
            aria-hidden
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-70"
          />
        )}
      </div>
    </button>
  );
}
