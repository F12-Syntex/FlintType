import type { HistoryTest } from "@/types/history";
import { cn } from "@/lib/utils";

/** Compact recent-runs list — last 6 completed tests, hairline-
 *  divided rows. Same shape as the profile list, kept inline so
 *  insights doesn't need to bounce out to the profile to peek at
 *  recent activity. */
export function RecentTests({ tests }: { tests: readonly HistoryTest[] }) {
  const completed = tests.filter((t) => t.wasCompleted).slice(0, 6);
  if (completed.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Run a few tests at <span className="text-foreground">/app</span>{" "}
        — your latest results will land here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {completed.map((t) => (
        <li
          key={t.id}
          className={cn(
            "grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.02]",
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {formatWhen(t.startedAtMs)}
            </span>
            <span className="text-[12px] text-foreground">
              {prettyMode(t.mode)} ·{" "}
              <span className="tabular-nums">{t.durationOrWordCount}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-3 font-mono tabular-nums">
            <span className="text-xl font-bold text-primary">
              {Math.round(t.wpm)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t.accuracy.toFixed(1)}%
            </span>
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

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = (now - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d ago`;
  return d.toLocaleDateString();
}
