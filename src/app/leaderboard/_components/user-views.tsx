"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { useBackend } from "@/lib/backend";
import { skillTierForNetWpm } from "@/lib/skill-tier";
import { cn } from "@/lib/utils";
import type { TopLevelPlayer, TopPlayer } from "@/types/leaderboard";
import { BoardActions } from "./board-actions";
import { CellPill, LeaderboardRow } from "./board-row";
import {
  type BoardColumns,
  EmptyBoard,
  LeaderboardBoard,
} from "./shared-list";
import { LeaderboardToolbar } from "./toolbar";
import { type RankedState, useRanked } from "./use-ranked";

/** User-centric views (Players, Level). Both render through the shared
 *  board in `shared-list.tsx`; only the columns and cells differ. */
const FETCH_LIMIT = 50;

type Backend = ReturnType<typeof useBackend>;
const loadPlayers = (b: Backend) =>
  b.leaderboard.topPlayers({ limit: FETCH_LIMIT });
const loadLevels = (b: Backend) =>
  b.leaderboard.topByLevel({ limit: FETCH_LIMIT });

const PLAYER_COLUMNS: BoardColumns = {
  cells: ["Tier", "Runs", "Acc"],
  headline: "WPM",
};
const LEVEL_COLUMNS: BoardColumns = {
  cells: ["Progress", "Runs", "XP"],
  headline: "Level",
};

export function TopPlayersView() {
  const youUserId = useUser().user?.id ?? null;
  const state = useRanked<TopPlayer>("players", loadPlayers);
  return (
    <RankedBoard state={state} columns={PLAYER_COLUMNS}>
      {state.data?.map((p) => {
        const tier = sentenceCase(skillTierForNetWpm(p.bestNetWpm).label);
        const isYou = p.userId === youUserId;
        const runs = plural(p.testsCompleted, "run");
        return (
          <LeaderboardRow
            key={p.userId}
            href={`/profile/${p.username ?? p.userId}`}
            rank={p.rank}
            username={p.username}
            name={p.name}
            tags={p.tags}
            isYou={isYou}
            cells={[<CellPill key="t">{tier}</CellPill>, p.testsCompleted, `${Math.round(p.bestAccuracy)}%`]}
            headline={p.bestNetWpm}
            summary={`${tier} · ${runs}`}
            ariaLabel={`Rank ${p.rank}, ${handleOf(p)}${isYou ? " (you)" : ""}: best ${p.bestNetWpm} WPM, ${tier}, ${runs}`}
          />
        );
      })}
    </RankedBoard>
  );
}

export function TopLevelsView() {
  const youUserId = useUser().user?.id ?? null;
  const state = useRanked<TopLevelPlayer>("levels", loadLevels);
  return (
    <RankedBoard state={state} columns={LEVEL_COLUMNS}>
      {state.data?.map((p) => {
        const isYou = p.userId === youUserId;
        const pct = Math.round(Math.max(0, Math.min(1, p.levelProgress)) * 100);
        const runs = plural(p.testsCompleted, "run");
        return (
          <LeaderboardRow
            key={p.userId}
            href={`/profile/${p.username ?? p.userId}`}
            rank={p.rank}
            username={p.username}
            name={p.name}
            tags={p.tags}
            isYou={isYou}
            cells={[
              <LevelProgress key="p" pct={pct} isYou={isYou} />,
              p.testsCompleted,
              p.xp.toLocaleString(),
            ]}
            headline={p.level}
            summary={`${runs} · ${pct}% to level ${p.level + 1}`}
            ariaLabel={`Rank ${p.rank}, ${handleOf(p)}${isYou ? " (you)" : ""}: level ${p.level}, ${pct}% to the next level, ${runs}`}
          />
        );
      })}
    </RankedBoard>
  );
}

/** Toolbar + board + empty state shared by both user-centric views. */
function RankedBoard<T>({
  state,
  columns,
  children,
}: {
  state: RankedState<T>;
  columns: BoardColumns;
  children: ReactNode;
}) {
  const empty =
    !state.loading && !state.error && (state.data?.length ?? 0) === 0;
  return (
    <div className="flex flex-col gap-4">
      <LeaderboardToolbar
        actions={
          <BoardActions
            onRefresh={state.refresh}
            refreshing={state.loading || state.refreshing}
            generatedAt={state.generatedAt}
          />
        }
      />
      {empty ? (
        <EmptyBoard
          message="No ranked players yet. Finish a test to put your name on the board."
          actions={
            <Link href="/" className={buttonVariants()}>
              Start a test
            </Link>
          }
        />
      ) : (
        <LeaderboardBoard
          columns={columns}
          loading={state.loading}
          error={state.data == null ? state.error : null}
          onRetry={state.refresh}
        >
          {children}
        </LeaderboardBoard>
      )}
    </div>
  );
}

/** Progress toward the next level. Ink by default; orange on your row. */
function LevelProgress({ pct, isYou }: { pct: number; isYou: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "block h-full rounded-full",
            isYou ? "bg-primary" : "bg-foreground/60",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </span>
  );
}

function handleOf(p: { username: string | null; name: string }): string {
  return p.username ? `@${p.username}` : p.name;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function sentenceCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
