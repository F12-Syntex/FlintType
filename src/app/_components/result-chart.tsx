"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/line-chart";
import { cn } from "@/lib/utils";
import { ErrorRibbon } from "./error-ribbon";
import type { KeyEvent } from "./practice-state";

export type Bucket = { sec: number; wpm: number; raw: number };

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
  raw: { label: "raw", color: "var(--muted-foreground)" },
  errors: { label: "mistakes", color: "var(--destructive)" },
} satisfies ChartConfig;

/** Per-second error count bucketed off the keystroke stream — same
 *  time axis as the WPM trace so the two read together. */
function bucketErrors(events: readonly KeyEvent[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const e of events) {
    if (e.correct) continue;
    const sec = Math.max(1, Math.round(e.t / 1000));
    out.set(sec, (out.get(sec) ?? 0) + 1);
  }
  return out;
}

/** Detailed run chart: the WPM trace with a soft fill, the dashed raw
 *  trace, a faint average line and a ✕ on the trace at each second with
 *  a mistake. Below it, a ribbon plots mistakes per second on the same
 *  x scale (inset to the plot area) so miss-clusters line up with dips. */
export function ResultChart({
  buckets,
  events,
  startAtZero,
  height = "h-32 sm:h-44 lg:h-52",
}: {
  buckets: readonly Bucket[];
  events: readonly KeyEvent[];
  startAtZero: boolean;
  height?: string;
}) {
  const { merged, avgWpm, errorBuckets, maxErrors } = useMemo(() => {
    if (buckets.length < 2) {
      return {
        merged: [] as MergedBucket[],
        avgWpm: 0,
        errorBuckets: new Map<number, number>(),
        maxErrors: 0,
      };
    }
    const errs = bucketErrors(events);
    const merged: MergedBucket[] = buckets.map((b) => {
      const errors = errs.get(b.sec) ?? 0;
      return {
        ...b,
        errors,
        gap: Math.max(0, b.raw - b.wpm),
        // ✕-marker y-value: the wpm at this second ONLY when a mistake
        // happened, else null. The Scatter plots over the FULL merged
        // array off this key — recharts skips null points (null cx/cy),
        // so a clean second renders no mark, and a zero-error run renders
        // none at all. (A filtered `data=[]` would fall back to chart
        // data and stamp a ✕ at every bucket — FT-006.)
        errorWpm: errors > 0 ? b.wpm : null,
      };
    });
    const avg = merged.reduce((s, b) => s + b.wpm, 0) / merged.length;
    const maxErr = [...errs.values()].reduce((m, v) => (v > m ? v : m), 0);
    return {
      merged,
      avgWpm: avg,
      errorBuckets: errs,
      maxErrors: maxErr,
    };
  }, [buckets, events]);

  if (buckets.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Run too short for a chart.
      </p>
    );
  }

  const firstSec = buckets[0]?.sec ?? 1;
  const lastSec = buckets[buckets.length - 1]?.sec ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className={cn("aspect-auto w-full", height)}
      >
        <ComposedChart
          accessibilityLayer
          data={merged}
          margin={{ left: 8, right: 16, top: 18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="wpmGap" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-wpm)"
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor="var(--color-wpm)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          {/* Numeric axis over the run's seconds. A category axis plus a
           *  Scatter carrying its own copy of the data made recharts
           *  concatenate both x sets (1..n, 1..n): every tick printed
           *  twice and the plot filled only the left half. */}
          <XAxis
            dataKey="sec"
            type="number"
            domain={["dataMin", "dataMax"]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v: number) => `${v}s`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={32}
            domain={startAtZero ? [0, "auto"] : ["auto", "auto"]}
          />
          <ChartTooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, items) => {
                  const first = (items as Array<{ payload?: MergedBucket }>)[0];
                  const sec = first?.payload?.sec ?? 0;
                  const errs = first?.payload?.errors ?? 0;
                  return errs > 0
                    ? `${sec}s · ${errs} error${errs === 1 ? "" : "s"}`
                    : `${sec}s`;
                }}
              />
            }
          />

          {/* Average speed reference: a solid, faint line so it reads
           *  as a level, distinct from the dashed raw trace. */}
          {avgWpm > 0 ? (
            <ReferenceLine
              y={avgWpm}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          ) : null}

          <Line
            dataKey="raw"
            type="monotone"
            stroke="var(--color-raw)"
            strokeWidth={1.25}
            strokeOpacity={0.55}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />
          {/* WPM trace + its soft fill as ONE series. Previously a
              separate fill-only <Area dataKey="wpm"> plus this line both
              keyed "wpm", so the tooltip listed "wpm" twice (#13). One
              <Area> draws the stroke and the gradient fill together. */}
          <Area
            dataKey="wpm"
            type="monotone"
            stroke="var(--color-wpm)"
            strokeWidth={2.25}
            fill="url(#wpmGap)"
            dot={false}
            activeDot={{
              r: 3,
              stroke: "var(--color-wpm)",
              fill: "var(--background)",
            }}
            isAnimationActive={false}
          />

          {/* Mistake markers — a destructive ✕ on the WPM line at each
           *  second a wrong key was pressed, so the user can see where
           *  on the speed curve they slipped (errors usually sit in a
           *  dip). The count detail lives in the tooltip + the ribbon
           *  below; these are aria-hidden so they don't double-announce.
           *  Keyed off `errorWpm` (NOT `wpm`) and inheriting the chart's
           *  data (no `data` prop — passing a copy duplicated the x axis):
           *  null at clean seconds so recharts skips those points, and a
           *  unique dataKey so it never collides with the <Area>'s "wpm"
           *  tooltip row. `errorWpm` is absent from chartConfig, so the
           *  tooltip filters this decorative series out entirely (#13). */}
          <Scatter
            dataKey="errorWpm"
            shape={<ErrorMark />}
            isAnimationActive={false}
          />

          {/* Peak / stall numbers live in the stat strip under the
           *  chart — no on-chart markers; the wpm trace already shows
           *  where the line tops out and bottoms out. */}
        </ComposedChart>
      </ChartContainer>

      <ErrorRibbon
        firstSec={firstSec}
        lastSec={lastSec}
        errorBuckets={errorBuckets}
        maxErrors={maxErrors}
      />
    </div>
  );
}

type MergedBucket = Bucket & {
  errors: number;
  gap: number;
  /** wpm at this second when errors > 0, else null — the ✕ scatter's
   *  dedicated y-key (null points are skipped by recharts). */
  errorWpm: number | null;
};

/** A small destructive ✕ plotted on the WPM line at a second where a
 *  mistake occurred. Recharts hands the resolved pixel centre as
 *  `cx`/`cy`; we draw two crossed strokes. aria-hidden — the tooltip
 *  and the ribbon below carry the readable count. */
function ErrorMark(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  const r = 3.5;
  return (
    <g
      aria-hidden
      stroke="var(--color-errors)"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
      <line x1={cx - r} y1={cy + r} x2={cx + r} y2={cy - r} />
    </g>
  );
}
