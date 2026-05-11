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
import { Tag } from "@/components/ft";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/line-chart";
import type { TrendPoint } from "./derive-stats";

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
} satisfies ChartConfig;

/** WPM trend across the user's last N completed tests. Average is
 *  drawn as a dashed horizontal reference; a soft area fills under
 *  the line for presence. Tooltip surfaces the test ordinal + the
 *  date the test ran on. */
export function WpmTrend({ points }: { points: TrendPoint[] }) {
  const avg = useMemo(() => {
    if (points.length === 0) return 0;
    return points.reduce((s, p) => s + p.wpm, 0) / points.length;
  }, [points]);

  if (points.length < 2) {
    return (
      <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
        <div className="mb-3 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>WPM trend</Tag>
        </div>
        <p className="text-sm text-muted-foreground">
          Take a few more runs and the trend will fill in.
        </p>
      </section>
    );
  }

  return (
    <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>WPM trend · last {points.length} tests</Tag>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Avg{" "}
          <span className="text-foreground tabular-nums">
            {Math.round(avg)}
          </span>
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-40 w-full sm:h-52 lg:h-60"
      >
        <ComposedChart
          accessibilityLayer
          data={points}
          margin={{ left: 8, right: 16, top: 18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="wpmTrendArea" x1="0" y1="0" x2="0" y2="1">
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
            dataKey="idx"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v: number) => `#${v}`}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={32}
            domain={["auto", "auto"]}
          />
          <ChartTooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, items) => {
                  const first = (
                    items as Array<{ payload?: TrendPoint }>
                  )[0];
                  const p = first?.payload;
                  if (!p) return "";
                  const d = new Date(p.ts);
                  return `Test #${p.idx} · ${d.toLocaleDateString()}`;
                }}
              />
            }
          />
          {avg > 0 ? (
            <ReferenceLine
              y={avg}
              stroke="currentColor"
              strokeOpacity={0.32}
              strokeDasharray="3 4"
            />
          ) : null}
          <Area
            dataKey="wpm"
            type="monotone"
            stroke="none"
            fill="url(#wpmTrendArea)"
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
        </ComposedChart>
      </ChartContainer>
    </section>
  );
}
