import { cn } from "@/lib/utils";
import type { HistoryWeakness } from "@/types/history";

/** Horizontal-bar chart of the user's slowest patterns. Used by both
 *  the weakest-words and weakest-bigrams panels, same shape, just
 *  different data. The bar fills primary, sized against the topmost
 *  weakness in the list so contrast is preserved at low-data states.
 *
 *  Empty / cold-start states render a single muted line instead of
 *  an empty bar grid. */
export function WeaknessChart({
  rows,
  emptyHint,
  baselineMs,
}: {
  rows: readonly HistoryWeakness[];
  emptyHint: string;
  baselineMs: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {emptyHint}
      </p>
    );
  }
  const max = rows.reduce((m, r) => (r.weakness > m ? r.weakness : m), 0);
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.slice(0, 8).map((r) => {
        const ratio = max > 0 ? r.weakness / max : 0;
        const delta =
          baselineMs > 0
            ? Math.round(((r.meanMs - baselineMs) / baselineMs) * 100)
            : null;
        return (
          <li
            key={r.key}
            className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 font-mono text-xs tabular-nums"
          >
            <span className="truncate text-foreground">{r.key}</span>
            <span
              aria-hidden
              className="relative h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]"
            >
              <span
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-primary"
                style={{
                  transform: `scaleX(${Math.max(0.04, ratio)})`,
                  width: "100%",
                }}
              />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-muted-foreground">
                {Math.round(r.meanMs)}
                <span className="ml-0.5 text-[9.5px] uppercase tracking-[0.14em] opacity-70">
                  ms
                </span>
              </span>
              {delta != null ? (
                <span
                  className={cn(
                    "text-[10px]",
                    delta > 0 ? "text-primary" : "text-muted-foreground/70",
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}%
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
