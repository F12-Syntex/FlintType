"use client";

/** Persistent status pill at the top of the race surface declaring the
 *  user is in spectate mode. Sits above the race tree so it never
 *  competes with the race surface underneath. A quiet card pill with
 *  the live dot keeps it calm: spectator mode is *information*, not an
 *  alert. */
export function SpectatorBanner() {
  return (
    <div className="flex shrink-0 justify-center pt-3 sm:pt-4">
      <div
        role="status"
        className="inline-flex max-w-full items-center gap-2 rounded-pill border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-card"
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <span className="truncate">
          Spectating. This lobby is full or already started.
        </span>
      </div>
    </div>
  );
}
