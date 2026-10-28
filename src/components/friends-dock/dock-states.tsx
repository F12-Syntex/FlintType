import { Users } from "lucide-react";

/** Loading / empty / no-match states for the friends dock directory
 *  (ui-law §6.3 — every state stays visible). */

export function NoMatch({ query }: { query: string }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
      No one matches &ldquo;{query}&rdquo;.
    </p>
  );
}

export function DirectorySkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2" aria-hidden>
      <span className="mx-2.5 mb-1 h-2.5 w-16 rounded-full bg-muted" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
          <span className="size-10 shrink-0 rounded-full bg-muted motion-safe:animate-pulse" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-2.5 w-28 rounded-full bg-muted" />
            <span className="h-2 w-16 rounded-full bg-muted/70" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="mx-3 mt-1 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users size={18} aria-hidden />
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        You&apos;re not following anyone yet. Find people on the leaderboard
        and follow them.
      </p>
    </div>
  );
}
