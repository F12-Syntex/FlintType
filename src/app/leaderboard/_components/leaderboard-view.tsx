"use client";

import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { relativeTime } from "@/lib/relative-time";
import type { LeaderboardEntry, LeaderboardPreset } from "@/types/leaderboard";
import { BoardFrame } from "./board-frame";
import { CellPill, LeaderboardRow, RowSummary, type YouMark } from "./board-row";
import { EmptyActions } from "./empty-actions";
import { MODE_LABEL, parseView } from "./filters";
import { type BoardColumns, EmptyBoard, LeaderboardBoard } from "./shared-list";
import { describeSlice, runLengthLabel } from "./slice-labels";
import { useLeaderboard } from "./use-leaderboard";
import { useLeaderboardParams } from "./use-leaderboard-params";
import { TopLevelsView, TopPlayersView } from "./user-views";

/** /leaderboard board area (toolbar + table). The dispatcher picks one
 *  view component per `?view=` so each branch keeps a fixed hook order. */
export function LeaderboardView() {
  const view = parseView(useSearchParams().get("view"));
  if (view === "players") return <TopPlayersView />;
  if (view === "levels") return <TopLevelsView />;
  return <BestRunsView />;
}

/** The first detail column: on a board pinned to one length every row
 *  shares it, so the column shows when the run happened instead. Only
 *  "All lengths" needs a per-row length. */
function runColumns(preset: LeaderboardPreset): BoardColumns {
  return {
    cells: [preset === "any" ? "Length" : "When", "Raw", "Acc"],
    headline: "WPM",
  };
}

function BestRunsView() {
  const { filters, setFilters, authLoaded } = useLeaderboardParams();
  const youUserId = useUser().user?.id ?? null;
  // `filters` is already the effective slice (a friends link opened
  // signed out reads as global). A friends board waits for Clerk so a
  // signed-in viewer never sees the global board paint first.
  const waiting = filters.audience === "friends" && !authLoaded;

  const { data, error, loading, refreshing, refresh } = useLeaderboard(
    filters.scope,
    filters.window,
    filters.preset,
    filters.audience,
    !waiting,
  );
  const entries = data?.entries ?? [];
  const showEmpty = !loading && !error && entries.length === 0;
  // Entries arrive ranked, so your first row is your best run.
  const yourBest = entries.find((e) => e.userId === youUserId)?.testId;

  return (
    <BoardFrame
      onRefresh={refresh}
      refreshing={refreshing || loading}
      generatedAt={data?.generatedAtMs ?? null}
      refreshError={error && entries.length > 0 ? error : null}
    >
      {showEmpty ? (
        <EmptyBoard
          message={`No ${describeSlice(filters)} yet.`}
          actions={<EmptyActions slice={filters} setFilters={setFilters} />}
        />
      ) : (
        <LeaderboardBoard
          columns={runColumns(filters.preset)}
          loading={loading && entries.length === 0}
          error={error && entries.length === 0 ? error : null}
          onRetry={refresh}
        >
          {entries.map((entry) => (
            <RunRow
              key={entry.testId}
              entry={entry}
              preset={filters.preset}
              you={
                entry.userId !== youUserId
                  ? undefined
                  : entry.testId === yourBest
                    ? "best"
                    : "other"
              }
            />
          ))}
        </LeaderboardBoard>
      )}
    </BoardFrame>
  );
}

function RunRow({
  entry,
  preset,
  you,
}: {
  entry: LeaderboardEntry;
  preset: LeaderboardPreset;
  you?: YouMark;
}) {
  const acc = `${Math.round(entry.accuracy)}%`;
  const length = runLengthLabel(entry.durationOrWordCount, preset, entry.lengthMode);
  const when = relativeTime(entry.completedAtMs);
  const mode = MODE_LABEL[entry.mode] ?? entry.mode;
  const handle = entry.username ? `@${entry.username}` : entry.name;
  const anyLength = preset === "any";
  return (
    <LeaderboardRow
      href={`/profile/${entry.username ?? entry.userId}`}
      rank={entry.rank}
      username={entry.username}
      name={entry.name}
      tags={entry.tags}
      you={you}
      cells={[
        anyLength ? (
          <CellPill key="l">{length}</CellPill>
        ) : (
          <span key="w" className="text-sm text-muted-foreground">
            {when}
          </span>
        ),
        entry.wpm,
        acc,
      ]}
      headline={entry.netWpm}
      summary={
        <RowSummary
          parts={
            anyLength
              ? [length, `${acc} accuracy`, `${entry.wpm} raw`]
              : [`${acc} accuracy`, `${entry.wpm} raw`, when]
          }
        />
      }
      ariaLabel={`Rank ${entry.rank}, ${handle}${you ? " (you)" : ""}: ${entry.netWpm} WPM, raw ${entry.wpm}, ${acc} accuracy, ${mode} ${length}, ${when}`}
    />
  );
}
