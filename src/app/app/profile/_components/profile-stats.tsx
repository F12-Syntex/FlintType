import { cn } from "@/lib/utils";
import type { ProfileTotals, StreakStats } from "./derive-stats";

/** Headline numbers strip — one row at sm+, 2-col grid on mobile.
 *  Mirrors the on-page stat strip pattern from /app/biogram so the
 *  product feels consistent. Leaderboard rank is mocked at "—" until
 *  the rankings backend ships; the slot stays so the layout doesn't
 *  jump when it lands. */
export function ProfileStats({
  totals,
  streak,
  rank,
}: {
  totals: ProfileTotals;
  streak: StreakStats;
  rank: number | null;
}) {
  return (
    <section className="border-b border-border px-5 py-8 sm:px-16 sm:py-10">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-5 sm:gap-x-6">
        <Stat
          label="Tests completed"
          value={totals.testsCompleted.toLocaleString()}
          accent
        />
        <Stat
          label="Time typing"
          value={formatDuration(totals.totalSeconds)}
        />
        <Stat
          label="Best WPM"
          value={Math.round(totals.bestWpm).toString()}
          accent
        />
        <Stat
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
        <Stat
          label="Leaderboard"
          value={rank != null ? `#${rank}` : "—"}
          subline={rank != null ? "Global" : "Coming soon"}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
  subline,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
  subline?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-2xl font-bold tabular-nums leading-none sm:text-3xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="text-base font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      {subline ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
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
