import { cn } from "@/lib/utils";
import type { ProfileTotals, StreakStats } from "./derive-stats";
import { ProfileSection } from "./profile-section";

/** Lifetime-totals strip — tight horizontal row of stats with vertical
 *  hairline dividers between cells (no gap), each cell content
 *  centered. The strip itself centers within the section so it reads
 *  as a single composed band rather than a left-aligned 6-cell grid.
 *
 *  Wraps responsively: 2-up on mobile, 3-up at sm, all 6 inline at
 *  lg+. The dividers + bordered card frame replace the wide gaps that
 *  used to scatter the cells across the row. */
export function ProfileStats({
  totals,
  streak,
  rank,
}: {
  totals: ProfileTotals;
  streak: StreakStats;
  rank: number | null;
}) {
  const completionPct = Math.round(totals.completionRate * 100);
  return (
    <ProfileSection label="Lifetime totals">
      <div className="mx-auto">
        <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
          <MetricCell
            label="Tests started"
            value={totals.testsStarted.toLocaleString()}
          />
          <MetricCell
            label="Tests completed"
            value={totals.testsCompleted.toLocaleString()}
            accent
            subline={`${completionPct}% completion`}
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
            suffix={streak.current === 1 ? "d" : "d"}
            accent={streak.current > 0}
          />
          <MetricCell
            label="Leaderboard"
            value={rank != null ? `#${rank}` : "—"}
            subline={rank != null ? "Global" : "Coming soon"}
          />
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
    <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-5 text-center sm:px-4 sm:py-6">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-xl font-semibold tracking-[-0.01em] tabular-nums leading-none sm:text-2xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      {subline ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
