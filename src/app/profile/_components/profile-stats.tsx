import { cn } from "@/lib/utils";
import type { ProfileTotals, StreakStats } from "./derive-stats";
import { ProfileSection } from "./profile-section";

/** Lifetime-totals strip — tight horizontal row of stats with vertical
 *  hairline dividers between cells (no gap), each cell content
 *  centered. The strip itself centers within the section so it reads
 *  as a single composed band rather than a left-aligned grid.
 *
 *  Five real cells: tests completed (primary — drives XP/level), tests
 *  started (secondary, no XP), time typing, best WPM, streak. Optional
 *  Leaderboard cell only renders once a global rank exists.
 *
 *  Tests completed is accented because it's the one the loop rewards;
 *  tests started is shown alongside so the viewer can see drop-off
 *  rate but it carries no XP — the level economy in `derive-stats.ts`
 *  has always been keyed on `testsCompleted`, this strip just makes
 *  that visible. */
export function ProfileStats({
  totals,
  streak,
  rank,
}: {
  totals: ProfileTotals;
  streak: StreakStats;
  rank: number | null;
}) {
  const showRank = rank != null;
  return (
    <ProfileSection label="Lifetime totals">
      <div className="mx-auto overflow-hidden rounded-md border border-border bg-card/40">
        <div
          className={cn(
            "grid grid-cols-2 divide-x divide-y divide-border sm:divide-y-0",
            showRank ? "sm:grid-cols-6" : "sm:grid-cols-5",
          )}
        >
          <MetricCell
            label="Tests completed"
            value={totals.testsCompleted.toLocaleString()}
            accent
            subline={
              totals.testsStarted > 0
                ? `${Math.round(totals.completionRate * 100)}% finish rate`
                : undefined
            }
          />
          <MetricCell
            label="Tests started"
            value={totals.testsStarted.toLocaleString()}
          />
          <MetricCell
            label="Time typing"
            value={formatDuration(totals.totalSeconds)}
          />
          <MetricCell
            label="Best WPM"
            value={Math.round(totals.bestWpm).toString()}
            accent
            subline={
              totals.bestWpm > 0
                ? `${totals.bestWpmAccuracy.toFixed(1)}%`
                : undefined
            }
          />
          <MetricCell
            label="Streak"
            value={streak.current.toString()}
            suffix="d"
            accent={streak.current > 0}
          />
          {showRank ? (
            <MetricCell
              label="Leaderboard"
              value={`#${rank}`}
              subline="Global"
            />
          ) : null}
        </div>
      </div>
    </ProfileSection>
  );
}

function MetricCell({
  label,
  value,
  suffix,
  subline,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  subline?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2 py-4 text-center sm:gap-1.5 sm:px-4 sm:py-6">
      <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-semibold tracking-[-0.01em] tabular-nums leading-none sm:text-2xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
            {suffix}
          </span>
        ) : null}
      </span>
      {subline ? (
        <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">
          {subline}
        </span>
      ) : null}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
