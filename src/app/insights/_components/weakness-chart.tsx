import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { HistoryWeakness } from "@/types/history";

/** Widest key column, in monospace characters; longer words truncate
 *  (the full word stays in the row's tooltip). */
const MAX_KEY_CH = 8;

/** Horizontal bars of the weakest patterns, in the model's rank order.
 *  The bar is the ranking score (how reliably slow the pattern is), so
 *  it always shrinks down the list; the ms and % columns are the raw
 *  figures beside it. Only the top bar (the weakness to fix first) is
 *  painted in the theme orange; the rest are ink so the eye lands on
 *  one thing.
 *
 *  Columns: key · bar · mean ms · % vs baseline. The key column is
 *  sized to the longest key in monospace `ch`, so short pair keys and
 *  longer words both leave the bar as much room as possible on a phone,
 *  and every row of a list shares the same column edges. */
export function WeaknessChart({
  rows,
  baselineMs,
  unit,
  limit = 8,
}: {
  rows: readonly HistoryWeakness[];
  baselineMs: number;
  /** "pair" | "word": used in each row's tooltip. */
  unit: string;
  limit?: number;
}) {
  const shown = rows.slice(0, limit);
  const max = shown.reduce((m, r) => (r.weakness > m ? r.weakness : m), 0);
  const keyCh = Math.min(
    MAX_KEY_CH,
    Math.max(2, ...shown.map((r) => r.key.length)),
  );
  const columns = { "--key-col": `${keyCh}ch` } as CSSProperties;
  return (
    <ul className="flex flex-col gap-2.5">
      {shown.map((r, i) => {
        const ratio = max > 0 ? r.weakness / max : 0;
        const delta =
          baselineMs > 0
            ? Math.round(((r.meanMs - baselineMs) / baselineMs) * 100)
            : null;
        const ms = Math.round(r.meanMs);
        const top = i === 0;
        return (
          <li
            key={r.key}
            style={columns}
            title={`${r.key}: ${ms} ms on average${delta != null && delta > 0 ? `, ${delta}% over your average ${unit}` : ""}, from ${r.sampleCount} samples`}
            className="grid grid-cols-[var(--key-col)_minmax(0,1fr)_3rem_2.75rem] items-center gap-2.5 font-mono text-sm tabular-nums sm:grid-cols-[var(--key-col)_minmax(0,1fr)_3.5rem_3rem] sm:gap-3"
          >
            <span
              className={cn(
                "truncate",
                top ? "font-semibold text-foreground" : "text-foreground/80",
              )}
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
              {ms}
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
