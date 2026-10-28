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

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
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

/** WPM over time — a line-art chart (no area fill) with a dashed mean.
 *  The range switch uses short labels so it fits one row at 375px. */
export function WpmTrend({ points }: { points: TrendPoint[] }) {
  const [range, setRange] = useState<Range>("all");
  // "Now" for the range cutoffs, fixed when the panel mounts so a
  // re-render never shifts the window under the chart.
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const cfg = RANGES.find((r) => r.id === range)!;
    if (cfg.ms == null) return points;
    const cutoff = now - cfg.ms;
    return points.filter((p) => p.ts >= cutoff);
  }, [points, range, now]);

  const avg = useMemo(() => {
    if (filtered.length === 0) return 0;
    return filtered.reduce((s, p) => s + p.wpm, 0) / filtered.length;
  }, [filtered]);

  const enough = filtered.length >= 2;

  return (
    <PageSection
      id="trend"
      title="WPM trend"
      description={
        enough
          ? `${filtered.length} tests · ${Math.round(avg)} wpm average`
          : "Your speed over recent tests."
      }
      actions={
        <SegmentedControl
          ariaLabel="Trend range"
          value={range}
          onValueChange={setRange}
          options={RANGE_OPTIONS}
          className={SECTION_SWITCH}
        />
      }
    >
      <Surface className="px-2 pt-5 pb-3 sm:px-4 sm:pt-6">
        {enough ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-56 w-full sm:h-64 lg:h-72"
          >
            <LineChart
              accessibilityLayer
              data={filtered}
              margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.07}
              />
              <XAxis
                dataKey="idx"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => `#${v}`}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={36}
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
        ) : (
          <p className="px-3 pb-3 text-sm text-muted-foreground">
            Not enough tests in this range yet. Try a wider window.
          </p>
        )}
      </Surface>
    </PageSection>
  );
}
