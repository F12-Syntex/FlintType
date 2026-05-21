"use client";

import { ArrowRight, Swords } from "lucide-react";
import Link from "next/link";

/** The dedicated challenges entry point — a single quiet row linking to
 *  /duels. Kept neutral (no coral) so it never competes with the live
 *  spark; clarity comes from the dedicated row + icon, not colour. Shows
 *  the count of challenges waiting when there are any, otherwise an
 *  invitation to start one. */
export function ChallengesCallout({ pending }: { pending: number }) {
  return (
    <Link
      href="/duels"
      className="group flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
        <Swords size={16} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-foreground">Challenges</span>
        <span className="truncate text-[12px] text-muted-foreground">
          {pending > 0
            ? `${pending} ${pending === 1 ? "challenge" : "challenges"} waiting for you`
            : "Race a friend to beat your run"}
        </span>
      </span>
      {pending > 0 ? (
        <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-md border border-border px-1.5 text-[12px] font-semibold tabular-nums text-foreground">
          {pending}
        </span>
      ) : (
        <ArrowRight
          size={16}
          aria-hidden
          className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      )}
    </Link>
  );
}
