"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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

/** Detailed run chart: WPM line + raw line + raw-vs-wpm gap as a soft
 *  fill, average WPM reference line, peak / stall reference dots, and
 *  per-second error markers along the time axis. Below the chart, a
 *  thin strip plots the error distribution as bars on the same x scale
 *  so the user can read rhythm and miss-clusters at a glance. */
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
    const merged: MergedBucket[] = buckets.map((b) => ({
      ...b,
      errors: errs.get(b.sec) ?? 0,
      gap: Math.max(0, b.raw - b.wpm),
    }));
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

  const totalSec = buckets[buckets.length - 1]?.sec ?? 0;

  return (
    <div className="flex flex-col gap-2">
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
          <XAxis
            dataKey="sec"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v: number) => `${v}s`}
            interval="preserveStartEnd"
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

          {/* Soft fill under WPM gives the trace presence */}
          <Area
            dataKey="wpm"
            type="monotone"
            stroke="none"
            fill="url(#wpmGap)"
            isAnimationActive={false}
          />

          {/* Average WPM reference — line only, no overlay text.
           *  The labelled value lives in the stat strip under the
           *  chart so it never collides with the plot area. */}
          {avgWpm > 0 ? (
            <ReferenceLine
              y={avgWpm}
              stroke="currentColor"
              strokeOpacity={0.32}
              strokeDasharray="3 4"
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
          <Line
            dataKey="wpm"
            type="monotone"
            stroke="var(--color-wpm)"
            strokeWidth={2.25}
            dot={false}
            activeDot={{
              r: 3,
              stroke: "var(--color-wpm)",
              fill: "var(--background)",
            }}
            isAnimationActive={false}
          />

          {/* Peak / stall numbers live in the stat strip under the
           *  chart — no on-chart markers; the wpm trace already shows
           *  where the line tops out and bottoms out. */}
        </ComposedChart>
      </ChartContainer>

      <ErrorRibbon
        totalSec={totalSec}
        errorBuckets={errorBuckets}
        maxErrors={maxErrors}
      />
    </div>
  );
}

type MergedBucket = Bucket & { errors: number; gap: number };

/** Per-second error histogram aligned to the WPM time axis. Quiet
 *  while at zero, fills primary on every miss. Reads as the rhythm
 *  of the run's mistakes — clusters → a stretch where you stalled
 *  on a hard pair; sparse → clean run. */
function ErrorRibbon({
  totalSec,
  errorBuckets,
  maxErrors,
}: {
  totalSec: number;
  errorBuckets: Map<number, number>;
  maxErrors: number;
}) {
  if (totalSec < 2) return null;
  const cells = Array.from({ length: totalSec }, (_, i) => {
    const sec = i + 1;
    return { sec, errors: errorBuckets.get(sec) ?? 0 };
  });
  const totalErrors = cells.reduce((s, c) => s + c.errors, 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {/* "mistakes" (keystroke timeline — every wrong keypress, when it
            happened) is deliberately distinct from the headline "errors"
            stat (uncorrected characters in the final text). Different
            label so the two numbers don't read as the same metric. */}
        <span>mistakes over time</span>
        <span className="text-muted-foreground/70 tabular-nums">
          {totalErrors === 0
            ? "no mistakes"
            : `${totalErrors} total · peak ${maxErrors}/s`}
        </span>
      </div>
      <div
        className="relative grid h-5 w-full gap-px overflow-hidden rounded-sm bg-foreground/[0.04]"
        style={{
          gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((c) => {
          const ratio =
            maxErrors > 0
              ? Math.max(0.18, c.errors / maxErrors)
              : 0;
          if (c.errors === 0) {
            return (
              <span
                key={c.sec}
                aria-hidden
                className="bg-transparent"
              />
            );
          }
          return (
            <span
              key={c.sec}
              aria-hidden
              title={`${c.sec}s · ${c.errors} error${c.errors === 1 ? "" : "s"}`}
              style={{
                transform: `scaleY(${ratio})`,
                transformOrigin: "bottom",
              }}
              className="bg-primary/85"
            />
          );
        })}
      </div>
    </div>
  );
}
