"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import type { LeaderboardEntry } from "@/types/leaderboard";
import { BoardActions } from "./board-actions";
import {
  describeSlice,
  type LeaderboardAudience,
  type LeaderboardFilters,
  MODE_LABEL,
  parseView,
} from "./filters";
import { CellPill, LeaderboardRow } from "./board-row";
import { EmptyBoard, LeaderboardBoard } from "./shared-list";
import { LeaderboardToolbar } from "./toolbar";
import { useLeaderboard } from "./use-leaderboard";
import {
  type SetLeaderboardFilters,
  useLeaderboardParams,
} from "./use-leaderboard-params";
import { TopLevelsView, TopPlayersView } from "./user-views";

/** /leaderboard board area (toolbar + table). The dispatcher picks one
 *  view component per `?view=` so each branch keeps a fixed hook order. */
export function LeaderboardView() {
  const view = parseView(useSearchParams().get("view"));
  if (view === "players") return <TopPlayersView />;
  if (view === "levels") return <TopLevelsView />;
  return <BestRunsView />;
}

const RUN_COLUMNS = {
  cells: ["Mode", "Raw", "Acc"],
  headline: "WPM",
} as const;

function BestRunsView() {
  const { filters, setFilters } = useLeaderboardParams();
  const { user } = useUser();
  const youUserId = user?.id ?? null;
  // Friends needs a signed-in caller; anonymous viewers always see the
  // global board (the switch is hidden for them too).
  const audience: LeaderboardAudience = user ? filters.audience : "global";
  const slice: LeaderboardFilters = { ...filters, audience };

  const { data, error, loading, refreshing, refresh } = useLeaderboard(
    slice.scope,
    slice.window,
    slice.preset,
    audience,
  );
  const entries = data?.entries ?? [];
  const showEmpty = !loading && !error && entries.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <LeaderboardToolbar
        actions={
          <BoardActions
            onRefresh={refresh}
            refreshing={refreshing || loading}
            generatedAt={data?.generatedAtMs ?? null}
          />
        }
      />
      {showEmpty ? (
        <EmptyBoard
          message={`No ${describeSlice(slice)} yet.`}
          actions={<EmptyActions slice={slice} setFilters={setFilters} />}
        />
      ) : (
        <LeaderboardBoard
          columns={RUN_COLUMNS}
          loading={loading && entries.length === 0}
          error={error && entries.length === 0 ? error : null}
          onRetry={refresh}
        >
          {entries.map((entry) => (
            <RunRow
              key={entry.testId}
              entry={entry}
              isYou={entry.userId === youUserId}
            />
          ))}
        </LeaderboardBoard>
      )}
    </div>
  );
}

function RunRow({ entry, isYou }: { entry: LeaderboardEntry; isYou: boolean }) {
  const acc = `${Math.round(entry.accuracy)}%`;
  const length = lengthLabel(entry.durationOrWordCount);
  const mode = MODE_LABEL[entry.mode] ?? entry.mode;
  const handle = entry.username ? `@${entry.username}` : entry.name;
  return (
    <LeaderboardRow
      href={`/profile/${entry.username ?? entry.userId}`}
      rank={entry.rank}
      username={entry.username}
      name={entry.name}
      tags={entry.tags}
      isYou={isYou}
      cells={[<CellPill key="m">{`${mode} · ${length}`}</CellPill>, entry.wpm, acc]}
      headline={entry.netWpm}
      summary={`${length} · ${acc} acc · raw ${entry.wpm}`}
      ariaLabel={`Rank ${entry.rank}, ${handle}${isYou ? " (you)" : ""}: ${entry.netWpm} WPM, raw ${entry.wpm}, ${acc} accuracy, ${mode} ${length}`}
    />
  );
}

const TIME_AMOUNTS = new Set([15, 30, 60, 120]);

function lengthLabel(amount: number): string {
  return TIME_AMOUNTS.has(amount) ? `${amount}s` : `${amount} words`;
}

/** The widest filter that is narrowing the board, offered as one tap to
 *  show more, plus a way to put a run on the board. */
function EmptyActions({
  slice,
  setFilters,
}: {
  slice: LeaderboardFilters;
  setFilters: SetLeaderboardFilters;
}) {
  const widen =
    slice.preset !== "any"
      ? { label: "Show all lengths", next: { preset: "any" as const } }
      : slice.window !== "all_time"
        ? { label: "Show all time", next: { window: "all_time" as const } }
        : slice.audience === "friends"
          ? { label: "Show everyone", next: { audience: "global" as const } }
          : null;
  return (
    <>
      {widen ? (
        <Button type="button" onClick={() => setFilters(widen.next)}>
          {widen.label}
        </Button>
      ) : null}
      <Link
        href="/"
        className={buttonVariants({ variant: widen ? "ghost" : "default" })}
      >
        Start a test
      </Link>
    </>
  );
}
