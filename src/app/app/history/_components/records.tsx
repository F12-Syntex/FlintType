import { cn } from "@/lib/utils";

export type RecordRow = {
  /** Display label, e.g. "WORDS · 50". */
  mode: string;
  wpm: number;
  /** Epoch ms of the run that set this record. */
  completedAtMs: number;
};

/** Simple "x days ago" formatter — stays consistent across SSR/client
 *  so long as both render with the same now. The HistoryView resolves
 *  `now` at render time on the client; the page is purely client. */
function relativeTime(ms: number, now: number): string {
  const dayMs = 86_400_000;
  const days = Math.floor((now - ms) / dayMs);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const wk = Math.floor(days / 7);
    return wk === 1 ? "1 week ago" : `${wk} weeks ago`;
  }
  if (days < 365) {
    const mo = Math.floor(days / 30);
    return mo === 1 ? "1 month ago" : `${mo} months ago`;
  }
  const yr = Math.floor(days / 365);
  return yr === 1 ? "1 year ago" : `${yr} years ago`;
}

export function Records({
  records,
  now,
}: {
  records: readonly RecordRow[];
  now: number;
}) {
  if (records.length === 0) {
    return (
      <div className="py-6 text-xs text-ft-dim">No personal bests yet.</div>
    );
  }
  return (
    <div className="flex flex-col">
      {records.map((r) => {
        const rel = relativeTime(r.completedAtMs, now);
        return (
          <div
            key={r.mode}
            className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3.5 border-b border-ft-line-soft py-3"
          >
            <span className="text-xs font-medium tracking-wide">{r.mode}</span>
            <span
              className={cn(
                "text-lg font-bold tabular-nums tracking-[-0.02em]",
                rel === "today" ? "text-ft-ember" : "text-ft-ink",
              )}
            >
              {r.wpm}
            </span>
            <span className="min-w-22 text-right text-[10px] tracking-[0.1em] text-ft-dim uppercase">
              {rel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
