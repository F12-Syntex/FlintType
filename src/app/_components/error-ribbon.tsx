"use client";

/** Per-second mistake histogram under the result chart, on the same x
 *  scale as the plot: it's inset by the chart's y-axis column + left
 *  margin (32 + 8px = pl-10) and right margin (16px = pr-4), and each
 *  bar is centred on its second's position in the numeric x domain, so
 *  a cluster of misses sits right under the dip it caused. Bars are
 *  destructive, matching the ✕ marks on the trace. */
export function ErrorRibbon({
  firstSec,
  lastSec,
  errorBuckets,
  maxErrors,
}: {
  firstSec: number;
  lastSec: number;
  errorBuckets: Map<number, number>;
  maxErrors: number;
}) {
  const span = lastSec - firstSec;
  if (span < 1) return null;
  const cells = [...errorBuckets.entries()].filter(
    ([sec, n]) => n > 0 && sec >= firstSec && sec <= lastSec,
  );
  const totalErrors = [...errorBuckets.values()].reduce((s, n) => s + n, 0);
  return (
    <div className="flex flex-col gap-1.5 pr-4 pl-10">
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        {/* "Mistakes" (every wrong keypress, and when) — the timeline
         *  view of the headline Errors number. */}
        <span className="font-medium">Mistakes over time</span>
        <span className="tabular-nums">
          {totalErrors === 0
            ? "None"
            : `${totalErrors} total · up to ${maxErrors}/s`}
        </span>
      </div>
      <div className="relative h-5 w-full rounded-full bg-muted/70">
        {cells.map(([sec, n]) => {
          const ratio = maxErrors > 0 ? Math.max(0.25, n / maxErrors) : 0;
          return (
            <span
              key={sec}
              aria-hidden
              title={`${sec}s · ${n} mistake${n === 1 ? "" : "s"}`}
              className="absolute bottom-0 w-1 -translate-x-1/2 rounded-full bg-destructive/70"
              style={{
                left: `${((sec - firstSec) / span) * 100}%`,
                height: `${ratio * 100}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
