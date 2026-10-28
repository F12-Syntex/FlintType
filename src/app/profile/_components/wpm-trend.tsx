"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { PageSection, Surface } from "@/components/page-shell";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/line-chart";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { TrendPoint } from "./derive-stats";
import { SECTION_SWITCH } from "./personal-bests";
import {
  TIME_AXIS_MAX_SPAN_MS,
  type TrendBucket,
  dayTickIndices,
  downsampleTrend,
  filterTrendByRange,
  meanTrendWpm,
} from "./trend-series";

const chartConfig = {
  wpm: { label: "WPM", color: "var(--primary)" },
} satisfies ChartConfig;

type Range = "day" | "week" | "month" | "3months" | "all";
const RANGES: { id: Range; short: string; label: string; ms: number | null }[] = [
  { id: "day", short: "1D", label: "Last day", ms: 86_400_000 },
  { id: "week", short: "1W", label: "Last week", ms: 7 * 86_400_000 },
  { id: "month", short: "1M", label: "Last month", ms: 30 * 86_400_000 },
  { id: "3months", short: "3M", label: "Last 3 months", ms: 90 * 86_400_000 },
  { id: "all", short: "All", label: "All time", ms: null },
];

const RANGE_OPTIONS = RANGES.map((r) => ({
  value: r.id,
  label: (
    <>
      <span aria-hidden>{r.short}</span>
      <span className="sr-only">{r.label}</span>
    </>
  ),
}));

const DAY_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const TIME_FMT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

/** WPM over time — a line-art chart (no area fill) with a dashed mean.
 *
 *  `points` is every completed run, oldest first. The range switch
 *  filters by date, the average is taken over the filtered runs, and
 *  only then is the series downsampled (mean WPM per equal bucket) so
 *  a long history stays a readable line. The axis and tooltip speak
 *  in dates, never a test number. */
export function WpmTrend({ points }: { points: TrendPoint[] }) {
  const [range, setRange] = useState<Range>("all");
  // "Now" for the range cutoffs, fixed when the panel mounts so a
  // re-render never shifts the window under the chart.
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const cfg = RANGES.find((r) => r.id === range)!;
    return filterTrendByRange(points, cfg.ms, now);
  }, [points, range, now]);
  const avg = useMemo(() => meanTrendWpm(filtered), [filtered]);
  const series = useMemo(() => downsampleTrend(filtered), [filtered]);

  const hasHistory = points.length >= 2;
  const enough = filtered.length >= 2;
  // About a day or less: label the axis by time of day. Longer: one
  // date label per day (never the same date twice), thinned to fit.
  const spanMs =
    series.length > 0 ? series[series.length - 1].toTs - series[0].fromTs : 0;
  const byTime = spanMs <= TIME_AXIS_MAX_SPAN_MS;
  const tickFmt = byTime ? TIME_FMT : DAY_FMT;
  const ticks = useMemo(
    () => (byTime ? undefined : dayTickIndices(series)),
    [byTime, series],
  );

  const description = !hasHistory
    ? "Your speed over time."
    : enough
      ? `${filtered.length} tests · ${Math.round(avg)} WPM average`
      : "Your speed over time.";

  return (
    <PageSection
      id="trend"
      title="WPM trend"
      description={description}
      actions={
        hasHistory ? (
          <SegmentedControl
            ariaLabel="Trend range"
            value={range}
            onValueChange={setRange}
            options={RANGE_OPTIONS}
            className={SECTION_SWITCH}
          />
        ) : null
      }
    >
      {enough ? (
        <Surface className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-56 w-full sm:h-64 lg:h-72"
          >
            <LineChart
              accessibilityLayer
              data={series}
              margin={{ left: 0, right: 4, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.07}
              />
              <XAxis
                dataKey="x"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                ticks={ticks}
                tickFormatter={(x: number) => {
                  const b = series[x];
                  return b
                    ? new Date(b.toTs).toLocaleString(undefined, tickFmt)
                    : "";
                }}
                interval={byTime ? "preserveStartEnd" : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={40}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => String(Math.round(v))}
              />
              <ChartTooltip
                cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, items) => {
                      const first = (
                        items as Array<{ payload?: TrendBucket }>
                      )[0];
                      return first?.payload ? bucketLabel(first.payload) : "";
                    }}
                    formatter={(value) => (
                      <span className="flex w-full items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-sm bg-primary"
                        />
                        <span className="flex-1 text-muted-foreground">WPM</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {Math.round(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              {avg > 0 ? (
                <ReferenceLine
                  y={avg}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeDasharray="3 4"
                />
              ) : null}
              <Line
                dataKey="wpm"
                type="monotone"
                stroke="var(--color-wpm)"
                strokeWidth={2.25}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: "var(--color-wpm)",
                  strokeWidth: 2,
                  fill: "var(--card)",
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </Surface>
      ) : (
        <Surface className="px-5 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {hasHistory
              ? "No tests in this range yet. Try a wider range."
              : "Finish two tests to see your trend."}
          </p>
        </Surface>
      )}
    </PageSection>
  );
}

/** Tooltip title: the run's date and time, or the date span and run
 *  count when the point averages several runs. */
function bucketLabel(b: TrendBucket): string {
  const from = new Date(b.fromTs);
  const to = new Date(b.toTs);
  if (b.count <= 1) {
    return `${from.toLocaleDateString(undefined, DAY_FMT)}, ${from.toLocaleTimeString(undefined, TIME_FMT)}`;
  }
  const sameDay = from.toDateString() === to.toDateString();
  const span = sameDay
    ? from.toLocaleDateString(undefined, DAY_FMT)
    : `${from.toLocaleDateString(undefined, DAY_FMT)} to ${to.toLocaleDateString(undefined, DAY_FMT)}`;
  return `${span} · average of ${b.count} tests`;
}
