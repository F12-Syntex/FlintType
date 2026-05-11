"use client";

import { useMemo, useState } from "react";
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
import type { TrendPoint } from "./derive-stats";
import { ProfileSection } from "./profile-section";

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
} satisfies ChartConfig;

const RANGES: { id: Range; label: string; ms: number | null }[] = [
  { id: "day", label: "Last day", ms: 86_400_000 },
  { id: "week", label: "Last week", ms: 7 * 86_400_000 },
  { id: "month", label: "Last month", ms: 30 * 86_400_000 },
  { id: "3months", label: "Last 3 months", ms: 90 * 86_400_000 },
  { id: "all", label: "All time", ms: null },
];

type Range = "day" | "week" | "month" | "3months" | "all";

/** WPM trend across the user's completed tests. MonkeyType-style time
 *  filter chips run above the chart so the user can zoom into a recent
 *  slice or step out to all-time. The avg dashed line + soft area
 *  fill stay; the chart breathes taller (h-60 sm:h-72) for presence. */
export function WpmTrend({ points }: { points: TrendPoint[] }) {
  const [range, setRange] = useState<Range>("all");

  const filtered = useMemo(() => {
    const cfg = RANGES.find((r) => r.id === range)!;
    if (cfg.ms == null) return points;
    const cutoff = Date.now() - cfg.ms;
    return points.filter((p) => p.ts >= cutoff);
  }, [points, range]);

  const avg = useMemo(() => {
    if (filtered.length === 0) return 0;
    return filtered.reduce((s, p) => s + p.wpm, 0) / filtered.length;
  }, [filtered]);

  return (
    <ProfileSection
      label="WPM trend"
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors sm:px-2.5 sm:text-[11px] sm:tracking-[0.14em]",
                  active
                    ? "border-primary/40 bg-primary/[0.06] text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      }
    >
      {filtered.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Not enough data in this range. Try a wider window.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span>
              <span className="text-foreground tabular-nums">
                {filtered.length}
              </span>{" "}
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
            className="aspect-auto h-52 w-full sm:h-64 lg:h-72"
          >
            <ComposedChart
              accessibilityLayer
              data={filtered}
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
        </>
      )}
    </ProfileSection>
  );
}
