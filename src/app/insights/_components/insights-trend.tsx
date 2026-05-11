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
import type { HistoryTest } from "@/types/history";

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
} satisfies ChartConfig;

type Point = { idx: number; wpm: number; ts: number };

/** Compact WPM trend — last 30 completed tests. Same shape as the
 *  profile trend chart but dropped one size class so it fits inside
 *  the insights flow without dominating the page. */
export function InsightsTrend({
  tests,
}: {
  tests: readonly HistoryTest[];
}) {
  const points: Point[] = useMemo(() => {
    const completed = tests.filter((t) => t.wasCompleted);
    const ordered = [...completed].reverse().slice(-30);
    return ordered.map((t, i) => ({
      idx: i + 1,
      wpm: t.wpm,
      ts: t.startedAtMs,
    }));
  }, [tests]);

  const avg = useMemo(() => {
    if (points.length === 0) return 0;
    return points.reduce((s, p) => s + p.wpm, 0) / points.length;
  }, [points]);

  if (points.length < 2) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Take a few more tests and the trend will fill in.
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>
          Last <span className="text-foreground tabular-nums">{points.length}</span>{" "}
          tests
        </span>
        <span>
          Avg{" "}
          <span className="text-foreground tabular-nums">
            {Math.round(avg)}
          </span>{" "}
          wpm
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-44 w-full sm:h-52"
      >
        <ComposedChart
          accessibilityLayer
          data={points}
          margin={{ left: 8, right: 16, top: 12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="insightsTrendArea" x1="0" y1="0" x2="0" y2="1">
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
                  const first = (items as Array<{ payload?: Point }>)[0];
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
            fill="url(#insightsTrendArea)"
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
    </>
  );
}
