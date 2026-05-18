"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { TopLevelPlayer, TopPlayer } from "@/types/leaderboard";

/** Compact sidebar rails for the leaderboard — replaces the big
 *  card-grid strips that used to sit in the main view. Two lists:
 *  Top Players (by lifetime peak net-WPM) and Top by Level (by
 *  accumulated XP). Each entry is a single row: rank · handle ·
 *  secondary metric. Clicking opens the player's profile.
 *
 *  Both rails do their own backend fetch — they're independent of
 *  the main leaderboard's filter params (mode/window/preset) so a
 *  filter swap doesn't refetch them. */

const FETCH_LIMIT = 5;

export function SidebarTopPlayers() {
  const backend = useBackend();
  const [data, setData] = useState<readonly TopPlayer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    backend.leaderboard
      .topPlayers({ limit: FETCH_LIMIT })
      .then((r) => {
        if (!cancelled) setData(r.players);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <Rail title="Top players" hint="Peak WPM">
      {data == null
        ? renderSkeleton()
        : data.length === 0
          ? renderEmpty("No completed runs yet")
          : data.map((p) => (
              <Row
                key={p.userId}
                href={`/profile/${p.username ?? p.userId}`}
                rank={p.rank}
                name={p.name}
                tags={p.tags}
                metric={`${p.bestNetWpm}`}
                metricLabel="wpm"
              />
            ))}
    </Rail>
  );
}

export function SidebarTopLevels() {
  const backend = useBackend();
  const [data, setData] = useState<readonly TopLevelPlayer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    backend.leaderboard
      .topByLevel({ limit: FETCH_LIMIT })
      .then((r) => {
        if (!cancelled) setData(r.players);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <Rail title="Top by level" hint="Lifetime XP">
      {data == null
        ? renderSkeleton()
        : data.length === 0
          ? renderEmpty("No completed runs yet")
          : data.map((p) => (
              <Row
                key={p.userId}
                href={`/profile/${p.username ?? p.userId}`}
                rank={p.rank}
                name={p.name}
                tags={p.tags}
                metric={`L${p.level}`}
                metricLabel={formatXp(p.xp)}
              />
            ))}
    </Rail>
  );
}

/* ─── Building blocks ────────────────────────────────────────────── */

function Rail({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 px-2">
      <div className="flex items-baseline justify-between px-3 pt-2 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {hint}
        </span>
      </div>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function Row({
  href,
  rank,
  name,
  tags,
  metric,
  metricLabel,
}: {
  href: string;
  rank: number;
  name: string;
  tags: readonly string[];
  metric: string;
  metricLabel: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
          "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
        )}
      >
        <span className="w-5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] tabular-nums text-muted-foreground/70">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate font-medium text-foreground">{name}</span>
          {tags.map((t) => (
            <UserTag
              key={t}
              tag={t as never}
              size="sm"
              tooltip={false}
            />
          ))}
        </span>
        <span className="flex shrink-0 items-baseline gap-1 text-right tabular-nums">
          <span className="text-xs font-bold text-foreground">{metric}</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {metricLabel}
          </span>
        </span>
      </Link>
    </li>
  );
}

function renderSkeleton() {
  return Array.from({ length: FETCH_LIMIT }, (_, i) => (
    <li key={i} className="px-3 py-1.5">
      <span className="block h-4 w-full animate-pulse rounded-sm bg-muted/40" />
    </li>
  ));
}

function renderEmpty(text: string) {
  return (
    <li className="px-3 py-2 text-[11px] text-muted-foreground/80">{text}</li>
  );
}

function formatXp(xp: number): string {
  if (xp < 1_000) return String(xp);
  if (xp < 10_000) return `${(xp / 1_000).toFixed(1)}k`;
  if (xp < 1_000_000) return `${Math.round(xp / 1_000)}k`;
  return `${(xp / 1_000_000).toFixed(1)}M`;
}
