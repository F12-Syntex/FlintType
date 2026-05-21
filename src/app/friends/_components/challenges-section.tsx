"use client";

import { Swords } from "lucide-react";
import Link from "next/link";
import { UserTag } from "@/components/ft";
import type { Duel } from "@/types/duel";

/** Incoming challenges, surfaced **inline** on the hub (not a link out to
 *  a separate page). Each row is the trigger — the whole row links to the
 *  duel screen where you actually race the ghost — with a quiet "Take it"
 *  affordance rather than a filled coral button, so N challenges don't
 *  paint N coral sparks (one-spark rule, same pattern as LiveNow §17.1).
 *  Hidden entirely when nothing's waiting. */
export function ChallengesSection({ duels }: { duels: Duel[] }) {
  if (duels.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Swords size={13} aria-hidden className="text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Challenges
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          {duels.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {duels.map((d) => (
          <li key={d.id}>
            <ChallengeRow duel={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChallengeRow({ duel }: { duel: Duel }) {
  const challenger = duel.challenger;
  return (
    <Link
      href={`/duel/${duel.id}`}
      className="group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <Swords size={15} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {challenger.name}
          </span>
          {challenger.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          Dares you to beat{" "}
          <span className="text-foreground">
            {Math.round(duel.challengerWpm)}
          </span>{" "}
          wpm
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
        Take it →
      </span>
    </Link>
  );
}
