"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { Panel } from "./panel";

const chartConfig = {
  wpm: { label: "WPM", color: "var(--primary)" },
} satisfies ChartConfig;

type Point = { idx: number; wpm: number; ts: number };

/** WPM over the last 30 completed tests, oldest left. Line-art: one
 *  orange line (the page's data spark) over a hairline grid, with the
 *  average as a dashed ink rule. No area fill. */
export function TrendPanel({ tests }: { tests: readonly HistoryTest[] }) {
  const points: Point[] = useMemo(() => {
    const completed = tests.filter((t) => t.wasCompleted);
    const ordered = [...completed].reverse().slice(-30);
    return ordered.map((t, i) => ({
      idx: i + 1,
      wpm: Math.round(t.wpm),
      ts: t.startedAtMs,
    }));
  }, [tests]);

  const avg = useMemo(() => {
    if (points.length === 0) return 0;
    return points.reduce((s, p) => s + p.wpm, 0) / points.length;
  }, [points]);

  return (
    <Panel
      title="WPM"
      aside={
        points.length > 0 ? (
          <span>
            Avg{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {Math.round(avg)}
            </span>{" "}
            over <span className="tabular-nums">{points.length}</span>
          </span>
        ) : null
      }
      bodyClassName="flex flex-col"
    >
      {points.length < 2 ? (
        <p className="flex min-h-32 flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          Take a few more tests and the trend will fill in.
        </p>
      ) : (
        // Absolutely filled box: the card can stretch to its row-mate's
        // height while recharts still gets a definite size to measure.
        <div className="relative min-h-44 flex-1 sm:min-h-52">
          <ChartContainer
            config={chartConfig}
            className="absolute inset-0 aspect-auto h-full w-full"
          >
            <LineChart
              accessibilityLayer
              data={points}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <XAxis
                dataKey="idx"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => `#${v}`}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={40}
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
                      return `Test ${p.idx} · ${d.toLocaleDateString()}`;
                    }}
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
                  r: 3.5,
                  stroke: "var(--color-wpm)",
                  fill: "var(--background)",
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}
