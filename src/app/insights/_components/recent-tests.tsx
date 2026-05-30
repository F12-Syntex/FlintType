"use client";

import { useUser } from "@clerk/nextjs";
import { ShareRunButton } from "@/components/share-run-button";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { HistoryTest } from "@/types/history";

/** Compact recent-runs list, last 6 completed tests, hairline-
 *  divided rows. Same shape as the profile list, kept inline so
 *  insights doesn't need to bounce out to the profile to peek at
 *  recent activity. */
export function RecentTests({ tests }: { tests: readonly HistoryTest[] }) {
  // Insights only ever renders the signed-in user's own data
  // (history.summary is auth-gated upstream), so the share slug
  // handle is the viewer's own Clerk handle. Falls back to `racer`
  // while Clerk loads or for the deeply-pathological signed-out
  // path that should never reach this component.
  const { user } = useUser();
  const handle =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    "racer";
  const completed = tests.filter((t) => t.wasCompleted).slice(0, 6);
  if (completed.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Run a few tests at <span className="text-foreground">/app</span> and
        your latest results will land here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {completed.map((t) => (
        <li
          key={t.id}
          className={cn(
            "group/row grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {relativeTime(t.startedAtMs)}
            </span>
            <span className="text-[12px] text-foreground">
              {prettyMode(t.mode)} ·{" "}
              <span className="tabular-nums">{t.durationOrWordCount}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 font-mono tabular-nums sm:gap-3">
            <span className="text-xl font-bold text-primary">
              {Math.round(t.wpm)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t.accuracy.toFixed(1)}%
            </span>
            <ShareRunButton
              testId={t.id}
              handle={handle}
              wpm={t.wpm}
              className="self-center sm:opacity-0 sm:transition-opacity sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function prettyMode(m: string): string {
  if (m === "training" || m === "reverse_adaptive") return "training";
  return m;
}

