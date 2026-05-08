import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { HistoryTest } from "@/types/history";

const COLS = "grid-cols-[160px_130px_80px_80px_90px_60px]";

function relativeTime(ms: number, now: number): string {
  const day = 86_400_000;
  const diff = now - ms;
  const date = new Date(ms);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (diff < day) return `${hh}:${mm} today`;
  if (diff < 2 * day) return `yesterday ${hh}:${mm}`;
  const days = Math.floor(diff / day);
  return `${days} days ago`;
}

function modeLabel(t: HistoryTest): string {
  // The test row carries the algorithmic mode (training / casual /
  // reverse_adaptive). We project it onto the user-friendly tag the
  // typing page uses, parameterised by the run's word/time count.
  const m = t.mode === "training" ? "ADAPT" : "WORDS";
  return `${m}·${t.durationOrWordCount}`;
}

export function RunLog({
  tests,
  now,
}: {
  tests: readonly HistoryTest[];
  now: number;
}) {
  if (tests.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No runs in the window.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div
          className={`grid ${COLS} gap-3 border-t border-foreground border-b border-b-foreground/10 py-2.5`}
        >
          {["TIME", "MODE", "WPM", "ACC", "ERRORS", ""].map((h) => (
            <Tag key={h}>{h}</Tag>
          ))}
        </div>
        {tests.map((t) => (
          <div
            key={t.id}
            className={`grid ${COLS} items-baseline gap-3 border-b border-foreground/10 py-3 text-xs`}
          >
            <span className="text-muted-foreground">
              {relativeTime(t.completedAtMs, now)}
            </span>
            <span className="tracking-wide text-foreground">
              {modeLabel(t)}
            </span>
            <span
              className={cn(
                "font-bold tabular-nums",
                t.wpm >= 100 ? "text-primary" : "text-foreground",
              )}
            >
              {Math.round(t.wpm)}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {t.accuracy.toFixed(1)}%
            </span>
            <span
              className={cn(
                "tabular-nums",
                t.errorCount >= 6 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {t.errorCount}
            </span>
            <span className="text-right text-[10px] tracking-[0.16em] text-muted-foreground">
              {t.wasCompleted ? "DONE" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
