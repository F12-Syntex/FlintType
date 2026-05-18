"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { useBackend } from "@/lib/backend";
import { skillTierForNetWpm } from "@/lib/skill-tier";
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
      blurb="One row per user, ranked by lifetime XP (sum of net-WPM across every completed run)."
      error={error}
      empty={data?.length === 0}
      loading={data == null}
    >
      <ol className="flex flex-col">
        {data?.map((p) => (
          <LeaderboardRow
            key={p.userId}
            href={`/profile/${p.username ?? p.userId}`}
            rank={p.rank}
            username={p.username}
            name={p.name}
            tags={p.tags}
            isYou={p.userId === youUserId}
            headline={`L${p.level}`}
            headlineSuffix=""
            badge={formatXp(p.xp) + " xp"}
            hint={`${p.testsCompleted} runs`}
          />
        ))}
      </ol>
    </LeaderboardWrapper>
  );
}

function formatXp(xp: number): string {
  if (xp < 1_000) return String(xp);
  if (xp < 10_000) return `${(xp / 1_000).toFixed(1)}k`;
  if (xp < 1_000_000) return `${Math.round(xp / 1_000)}k`;
  return `${(xp / 1_000_000).toFixed(1)}M`;
}
