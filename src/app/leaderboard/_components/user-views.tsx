"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import { XP_PER_LEVEL } from "@/lib/level";
import { skillTierForNetWpm } from "@/lib/skill-tier";
import { cn } from "@/lib/utils";
import type { TopLevelPlayer, TopPlayer } from "@/types/leaderboard";
import { LeaderboardRow, LeaderboardWrapper } from "./shared-list";

/** User-centric leaderboard views — both pages reuse the shared
 *  Wrapper + Row from `shared-list.tsx` so the three leaderboard
 *  surfaces (recent runs, top players, top by level) render with
 *  identical chrome and per-row layout. The only thing that
 *  differs per view is the header copy + the metric mapping into
 *  the row's headline / badge / hint slots. */
const FETCH_LIMIT = 50;

export function TopPlayersView() {
  const backend = useBackend();
  const { user } = useUser();
  const youUserId = user?.id ?? null;
  const [data, setData] = useState<readonly TopPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    backend.leaderboard
      .topPlayers({ limit: FETCH_LIMIT })
      .then((r) => {
        if (!cancelled) setData(r.players);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <LeaderboardWrapper
      title="Top players"
      blurb="One row per user, ranked by lifetime peak net-WPM. Tier badge from the bot ladder."
      error={error}
      empty={data?.length === 0}
      loading={data == null}
    >
      <ol className="flex flex-col">
        {data?.map((p) => {
          const tier = skillTierForNetWpm(p.bestNetWpm);
          return (
            <LeaderboardRow
              key={p.userId}
              href={`/profile/${p.username ?? p.userId}`}
              rank={p.rank}
              username={p.username}
              name={p.name}
              tags={p.tags}
              isYou={p.userId === youUserId}
              headline={String(p.bestNetWpm)}
              headlineSuffix="wpm"
              badge={tier.label}
              hint={`${p.testsCompleted} runs`}
            />
          );
        })}
      </ol>
    </LeaderboardWrapper>
  );
}

export function TopLevelsView() {
  const backend = useBackend();
  const { user } = useUser();
  const youUserId = user?.id ?? null;
  const [data, setData] = useState<readonly TopLevelPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    backend.leaderboard
      .topByLevel({ limit: FETCH_LIMIT })
      .then((r) => {
        if (!cancelled) setData(r.players);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <LeaderboardWrapper
      title="Top by level"
      blurb="One row per user, ranked by completed-test count. Level here matches the level on each user's profile (10 completed tests = 1 level)."
      error={error}
      empty={data?.length === 0}
      loading={data == null}
    >
      <ol className="flex flex-col">
        {data?.map((p) => (
          <LevelRow
            key={p.userId}
            player={p}
            isYou={p.userId === youUserId}
          />
        ))}
      </ol>
    </LeaderboardWrapper>
  );
}

/** Bespoke row for the Top by Level view. Diverges from the shared
 *  `LeaderboardRow` shape because the level is the headline AND the
 *  row needs to carry a progress bar — neither fits the
 *  `headline / badge / hint` slot vocabulary cleanly.
 *
 *  Anatomy: big L<n> dial on the right · handle column in the middle
 *  with a thin XP-progress bar underneath · rank pill on the left.
 *  Same isYou tint + "You" pill as the shared row so all three views
 *  still feel like siblings; the level dial is the only visual
 *  divergence. */
function LevelRow({
  player,
  isYou,
}: {
  player: TopLevelPlayer;
  isYou: boolean;
}) {
  const handle = player.username ? `@${player.username}` : player.name;
  const leader = player.rank === 1;
  const href = `/profile/${player.username ?? player.userId}`;
  const pct = Math.max(0, Math.min(1, player.levelProgress)) * 100;
  return (
    <li
      className={cn(
        "border-b border-border/50 last:border-b-0",
        isYou && "bg-primary/[0.05]",
      )}
    >
      <Link
        href={href}
        className={cn(
          "flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4",
          "transition-colors hover:bg-accent",
        )}
      >
        <span
          className={cn(
            "w-8 shrink-0 text-[12px] font-semibold tabular-nums sm:text-[13px]",
            leader ? "text-primary" : "text-muted-foreground",
          )}
        >
          {String(player.rank).padStart(2, "0")}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "min-w-0 truncate text-[14px] sm:text-[15px]",
                isYou
                  ? "font-semibold text-primary"
                  : leader
                    ? "font-semibold text-foreground"
                    : "text-foreground/90",
              )}
            >
              {handle}
            </span>
            {player.tags.map((t) => (
              <UserTag key={t} tag={t} size="sm" className="shrink-0" />
            ))}
            {isYou ? (
              <span
                aria-label="Your entry"
                className="inline-flex h-5 shrink-0 items-center rounded-md border border-primary/40 bg-primary/[0.08] px-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-primary"
              >
                You
              </span>
            ) : null}
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums sm:inline">
              {player.testsCompleted} runs
            </span>
          </div>
          {/* XP progress bar — same level economy the profile hero
           *  uses, so the bar fill matches the bar a user sees on
           *  their own profile. */}
          <div
            aria-hidden
            className="relative h-1 w-full overflow-hidden rounded-full bg-foreground/[0.07]"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {player.xpIntoLevel} / {XP_PER_LEVEL} xp · next {player.level + 1}
          </span>
        </div>

        <div className="flex shrink-0 items-center">
          <span
            className={cn(
              "text-3xl font-bold leading-none tabular-nums sm:text-4xl",
              leader ? "text-primary" : "text-foreground",
            )}
          >
            {player.level}
          </span>
        </div>
      </Link>
    </li>
  );
}
