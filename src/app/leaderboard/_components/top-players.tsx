"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import { skillTierForNetWpm } from "@/lib/skill-tier";
import { cn } from "@/lib/utils";
import type { TopPlayer } from "@/types/leaderboard";

/** Top-of-leaderboard pinned strip: the highest-tier players by
 *  lifetime peak net-WPM. One row per user — distinct from the
 *  per-run table below where the same user can fill every slot.
 *
 *  Rendered once when the leaderboard page mounts; the data is a
 *  separate backend route (`leaderboard.topPlayers`) so filter
 *  changes don't refetch it. */
export function TopPlayers() {
  const backend = useBackend();
  const [data, setData] = useState<readonly TopPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    backend.leaderboard
      .topPlayers({ limit: 5 })
      .then((res) => {
        if (!cancelled) setData(res.players);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "failed to load top players");
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  if (error) {
    return (
      <section
        aria-label="Top players"
        className="mt-6 rounded-md border border-border bg-card px-5 py-4 sm:px-7"
      >
        <Header />
        <p className="mt-3 text-xs text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (data == null) {
    return (
      <section
        aria-label="Top players"
        className="mt-6 rounded-md border border-border bg-card px-5 py-4 sm:px-7"
      >
        <Header />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className="h-[68px] animate-pulse rounded-md border border-border bg-muted/30"
            />
          ))}
        </ul>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section
        aria-label="Top players"
        className="mt-6 rounded-md border border-border bg-card px-5 py-4 sm:px-7"
      >
        <Header />
        <p className="mt-3 text-xs text-muted-foreground">
          No completed runs yet — be the first to set a personal best.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Top players"
      className="mt-6 rounded-md border border-border bg-card px-5 py-5 sm:px-7"
    >
      <Header />
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {data.map((p) => (
          <TopPlayerCard key={p.userId} player={p} />
        ))}
      </ol>
    </section>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-7 bg-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Top players
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        Lifetime PB · one row per user
      </span>
    </div>
  );
}

function TopPlayerCard({ player }: { player: TopPlayer }) {
  const tier = skillTierForNetWpm(player.bestNetWpm);
  const href = `/profile/${player.username ?? player.userId}`;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex h-full flex-col gap-2 rounded-md border border-border bg-background px-3 py-3",
          "transition-colors hover:border-primary/40 hover:bg-accent/30",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.18em] tabular-nums text-muted-foreground",
            )}
          >
            {String(player.rank).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary",
            )}
          >
            {tier.label}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {player.name}
          </span>
          {player.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" tooltip={false} />
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {player.bestNetWpm}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {player.testsCompleted} runs
          </span>
        </div>
      </Link>
    </li>
  );
}
