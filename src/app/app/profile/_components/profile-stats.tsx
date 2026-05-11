import { cn } from "@/lib/utils";
import type { ProfileTotals, StreakStats } from "./derive-stats";
import { ProfileSection } from "./profile-section";

/** Headline-numbers strip. Tight 6-up at lg+, 3-up at sm, 2-up on
 *  mobile. Each stat: eyebrow tag · big tabular value (sm:text-4xl,
 *  matching ui-law §4 stat-lg) · optional muted subline. The ft
 *  <Stat/> delta paints primary/ok-tinted which read too loud for
 *  contextual sublines, so this page uses a local MetricStat. */
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6">
        <MetricStat
          label="Tests started"
          value={totals.testsStarted.toLocaleString()}
        />
        <MetricStat
          label="Tests completed"
          value={totals.testsCompleted.toLocaleString()}
          accent
          subline={`${completionPct}% completion`}
        />
        <MetricStat
          label="Time typing"
          value={formatDuration(totals.totalSeconds)}
        />
        <MetricStat
          label="Best WPM"
          value={Math.round(totals.bestWpm).toString()}
          accent
          subline={
            totals.bestAccuracy > 0
              ? `${totals.bestAccuracy.toFixed(1)}% best acc`
              : undefined
          }
        />
        <MetricStat
          label="Streak"
          value={streak.current.toString()}
          suffix={streak.current === 1 ? " day" : " days"}
          accent={streak.current > 0}
          subline={
            streak.longest > 0
              ? `Longest · ${streak.longest}`
              : "No streak yet"
          }
        />
        <MetricStat
          label="Leaderboard"
          value={rank != null ? `#${rank}` : "—"}
          subline={rank != null ? "Global" : "Coming soon"}
        />
      </div>
    </ProfileSection>
  );
}

function MetricStat({
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
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-xl font-semibold tracking-[-0.01em] tabular-nums leading-none sm:text-[22px]",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="text-xs font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      {subline ? (
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
