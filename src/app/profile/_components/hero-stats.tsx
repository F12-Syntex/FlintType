import { cn } from "@/lib/utils";
import type { StreakStats } from "./derive-activity";
import { XP_PER_LEVEL, type ProfileTotals } from "./derive-stats";

const NUM_FMT = new Intl.NumberFormat("en-US");
const DASH = "—";

/** The hero's headline stats: four soft tiles (2×2 on phones, a row
 *  from `sm`). Best WPM is the page's one orange number; the rest stay
 *  ink. `pending` (no snapshot yet, or it failed to load) shows dashes
 *  instead of misleading zeros, and so does Best WPM before the first
 *  finished run. */
export function HeroStats({
  totals,
  streak,
  pending,
}: {
  totals: ProfileTotals;
  streak: StreakStats;
  pending: boolean;
}) {
  // No finished run yet: a muted dash, never an orange zero.
  const noBest = pending || totals.bestWpm <= 0;
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <StatTile
        label="Tests"
        value={pending ? DASH : NUM_FMT.format(totals.testsCompleted)}
        sub={
          !pending && totals.testsStarted > totals.testsCompleted
            ? `${NUM_FMT.format(totals.testsStarted)} started`
            : undefined
        }
        pending={pending}
      />
      <StatTile
        label="Time typing"
        value={pending ? DASH : formatDuration(totals.totalSeconds)}
        pending={pending}
      />
      <StatTile
        label="Best WPM"
        value={noBest ? DASH : Math.round(totals.bestWpm).toString()}
        sub={
          noBest ? undefined : `${totals.bestWpmAccuracy.toFixed(1)}% accuracy`
        }
        accent
        pending={noBest}
      />
      <StatTile
        label="Streak"
        value={pending ? DASH : `${streak.current}`}
        suffix={pending ? undefined : streak.current === 1 ? "day" : "days"}
        sub={
          !pending && streak.longest > 0
            ? `${streak.longest}-day best`
            : undefined
        }
        pending={pending}
      />
    </dl>
  );
}

function StatTile({
  label,
  value,
  suffix,
  sub,
  accent = false,
  pending,
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  accent?: boolean;
  pending: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-muted/50 px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1">
        <span
          className={cn(
            "text-2xl font-bold leading-none tracking-[-0.02em] tabular-nums sm:text-3xl",
            pending
              ? "text-muted-foreground/50"
              : accent
                ? "text-primary"
                : "text-foreground",
          )}
        >
          {value}
          {suffix ? (
            <span className="ml-1 text-xs font-medium tracking-normal text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </span>
        <span className="min-h-4 truncate text-xs text-muted-foreground">
          {sub ?? ""}
        </span>
      </dd>
    </div>
  );
}

/** The experience bar that closes the hero card: the level, a chunky
 *  flame-filled track, and total / to-next-level XP beneath. */
export function LevelLockup({
  totals,
  pending,
}: {
  totals: ProfileTotals;
  pending: boolean;
}) {
  const toNext = Math.max(0, XP_PER_LEVEL - totals.xpIntoLevel);
  const pct = pending ? 0 : Math.round(totals.levelProgress * 100);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-muted-foreground">Level</span>
          <span
            className={cn(
              "text-2xl font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-3xl",
              pending ? "text-muted-foreground/50" : "text-foreground",
            )}
          >
            {pending ? DASH : totals.level}
          </span>
        </span>
        {pending ? null : (
          <span className="text-xs tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">
              {NUM_FMT.format(totals.xpIntoLevel)}
            </span>{" "}
            of {NUM_FMT.format(XP_PER_LEVEL)} XP
          </span>
        )}
      </div>
      <span
        role="progressbar"
        aria-label="Progress to next level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={
          pending
            ? undefined
            : `${NUM_FMT.format(totals.xpIntoLevel)} of ${NUM_FMT.format(XP_PER_LEVEL)} XP towards level ${totals.level + 1}`
        }
        className="relative block h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <span
          className="brand-surface absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </span>
      {pending ? null : (
        <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
          <span>{NUM_FMT.format(totals.totalXp)} XP in total</span>
          <span>
            {NUM_FMT.format(toNext)} XP to level {totals.level + 1}
          </span>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h >= 100) return `${h}h`;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}
