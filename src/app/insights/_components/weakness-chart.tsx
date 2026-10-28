import { cn } from "@/lib/utils";
import type { HistoryWeakness } from "@/types/history";

/** Horizontal bars of the slowest patterns, sized against the worst
 *  one. Only the top row (the weakness to fix first) is painted in the
 *  theme orange; the rest are ink so the eye lands on one thing.
 *  Columns: key · bar · mean ms · % vs baseline, fixed widths so the
 *  numbers line up row to row. */
export function WeaknessChart({
  rows,
  baselineMs,
  limit = 8,
  narrowKeys = false,
}: {
  rows: readonly HistoryWeakness[];
  baselineMs: number;
  limit?: number;
  /** Two-letter keys (bigrams) need far less room than whole words. */
  narrowKeys?: boolean;
}) {
  const shown = rows.slice(0, limit);
  const max = shown.reduce((m, r) => (r.weakness > m ? r.weakness : m), 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {shown.map((r, i) => {
        const ratio = max > 0 ? r.weakness / max : 0;
        const delta =
          baselineMs > 0
            ? Math.round(((r.meanMs - baselineMs) / baselineMs) * 100)
            : null;
        const top = i === 0;
        return (
          <li
            key={r.key}
            className={cn(
              "grid items-center gap-3 text-sm tabular-nums",
              narrowKeys
                ? "grid-cols-[2rem_minmax(0,1fr)_3.5rem_3rem]"
                : "grid-cols-[minmax(0,6rem)_minmax(0,1fr)_3.5rem_3rem]",
            )}
          >
            <span
              className={cn(
                "truncate font-mono",
                top ? "font-semibold text-foreground" : "text-foreground/80",
              )}
              title={r.key}
            >
              {r.key}
            </span>
            <span
              aria-hidden
              className="relative h-2 overflow-hidden rounded-full bg-foreground/[0.06]"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  top ? "bg-primary" : "bg-foreground/45",
                )}
                style={{ width: `${Math.max(4, ratio * 100)}%` }}
              />
            </span>
            <span className="text-right text-xs text-muted-foreground">
              {Math.round(r.meanMs)}
              <span className="ml-0.5 opacity-70">ms</span>
            </span>
            <span className="text-right text-xs text-muted-foreground">
              {delta != null ? `${delta > 0 ? "+" : ""}${delta}%` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
