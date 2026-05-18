"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { TopLevelPlayer } from "@/types/leaderboard";

/** Top-of-leaderboard companion strip to <TopPlayers />: ranks users
 *  by lifetime accumulated XP (sum of net-WPM across every completed
 *  run). XP rewards both volume and skill, so a player ascends both
 *  by typing more AND by typing faster. The headline number on each
 *  card is the level (server-derived via levelForXp); a secondary
 *  "X runs" stat keeps the volume context visible. */
export function TopLevels() {
  const backend = useBackend();
  const [data, setData] = useState<readonly TopLevelPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    backend.leaderboard
      .topByLevel({ limit: 5 })
      .then((res) => {
        if (!cancelled) setData(res.players);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "failed to load top by level",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  if (error) {
    return (
      <section
        aria-label="Top by level"
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
        aria-label="Top by level"
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
        aria-label="Top by level"
        className="mt-6 rounded-md border border-border bg-card px-5 py-4 sm:px-7"
      >
        <Header />
        <p className="mt-3 text-xs text-muted-foreground">
          No completed runs yet — be the first to climb.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Top by level"
      className="mt-6 rounded-md border border-border bg-card px-5 py-5 sm:px-7"
    >
      <Header />
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {data.map((p) => (
          <TopLevelCard key={p.userId} player={p} />
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
        Top by level
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        Lifetime XP · sum of every run
      </span>
    </div>
  );
}

function TopLevelCard({ player }: { player: TopLevelPlayer }) {
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
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] tabular-nums text-muted-foreground">
            {String(player.rank).padStart(2, "0")}
          </span>
          <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary tabular-nums">
            L{player.level}
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
            {formatXp(player.xp)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {player.testsCompleted} runs
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Compact XP formatter — keeps the headline number readable for
 *  high-XP players (a grandmaster with thousands of runs can sit
 *  above 100k XP and would otherwise crowd the card). */
function formatXp(xp: number): string {
  if (xp < 1_000) return String(xp);
  if (xp < 10_000) return `${(xp / 1_000).toFixed(1)}k`;
  if (xp < 1_000_000) return `${Math.round(xp / 1_000)}k`;
  return `${(xp / 1_000_000).toFixed(1)}M`;
}
