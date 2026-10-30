"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { useBackend } from "@/lib/backend";
import { skillTierForNetWpm } from "@/lib/skill-tier";
import { cn } from "@/lib/utils";
import type { TopLevelPlayer, TopPlayer } from "@/types/leaderboard";
import { BoardFrame } from "./board-frame";
import { CellPill, LeaderboardRow, RowSummary } from "./board-row";
import {
  type BoardColumns,
  EmptyBoard,
  LeaderboardBoard,
  STATE_CTA,
} from "./shared-list";
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
            you={isYou ? "best" : undefined}
            cells={[
              <CellPill key="t">{tier}</CellPill>,
              p.testsCompleted.toLocaleString(),
              `${Math.round(p.bestAccuracy)}%`,
            ]}
            headline={p.bestNetWpm}
            summary={<RowSummary parts={[tier, runs]} />}
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
            you={isYou ? "best" : undefined}
            cells={[
              <LevelProgress key="p" pct={pct} level={p.level} isYou={isYou} />,
              p.testsCompleted.toLocaleString(),
              p.xp.toLocaleString(),
            ]}
            headline={p.level}
            summary={
              <RowSummary
                parts={[
                  runs,
                  <LevelProgress key="p" pct={pct} level={p.level} isYou={isYou} className="w-24" />,
                ]}
              />
            }
            // The row link's label replaces its content for a screen reader,
            // so it states the level progress the bar shows.
            ariaLabel={`Rank ${p.rank}, ${handleOf(p)}${isYou ? " (you)" : ""}: level ${p.level}, ${pct} percent through it, ${runs}`}
          />
        );
      })}
    </RankedBoard>
  );
}

/** Frame + board + empty state shared by both user-centric views. A
 *  failed refresh over cached rows shows the frame's notice; with no
 *  rows the board shows its own error state. */
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
  const hasRows = (state.data?.length ?? 0) > 0;
  return (
    <BoardFrame
      onRefresh={state.refresh}
      refreshing={state.loading || state.refreshing}
      generatedAt={state.generatedAt}
      refreshError={hasRows ? state.error : null}
    >
      {empty ? (
        <EmptyBoard
          message="No ranked players yet. Finish a test to put your name on the board."
          actions={
            <Link href="/" className={cn(buttonVariants(), STATE_CTA)}>
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
    </BoardFrame>
  );
}

/** Progress through the current level as a bar only: the column is
 *  headed "Progress", and the figure is for screen readers. Ink by
 *  default; orange on your row (ui-law §5 Ranked table). */
type LevelProgressProps = { pct: number; level: number; isYou: boolean; className?: string };

function LevelProgress({ pct, level, isYou, className }: LevelProgressProps) {
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct} percent through level ${level}`}
      className={cn("block h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-muted", className)}
    >
      <span
        className={cn("block h-full rounded-full", isYou ? "bg-primary" : "bg-foreground/60")}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function handleOf(p: { username: string | null; name: string }): string {
  return p.username ? `@${p.username}` : p.name;
}

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

function sentenceCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
