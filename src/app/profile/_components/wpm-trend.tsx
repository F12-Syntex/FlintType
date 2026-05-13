"use client";

import { useMemo, useState } from "react";
import {
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

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
} satisfies ChartConfig;

type Range = "day" | "week" | "month" | "3months" | "all";
const RANGES: { id: Range; label: string; ms: number | null }[] = [
  { id: "day", label: "Day", ms: 86_400_000 },
  { id: "week", label: "Week", ms: 7 * 86_400_000 },
  { id: "month", label: "Month", ms: 30 * 86_400_000 },
  { id: "3months", label: "3m", ms: 90 * 86_400_000 },
  { id: "all", label: "All", ms: null },
];

/** WPM trend — line only (the area fill from the prior version
 *  doubled the visual mass without adding signal). Text-only range
 *  toggles above the chart instead of bordered chips, so the
 *  controls read as part of the section caption rather than a
 *  toolbar. Half height vs the prior version. */
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
    <section className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <SectionLabel>WPM trend</SectionLabel>
        <RangeToggles value={range} onChange={setRange} />
      </div>

      {filtered.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Not enough data in this range. Try a wider window.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
            className="aspect-auto h-40 w-full sm:h-48"
          >
            <ComposedChart
              accessibilityLayer
              data={filtered}
              margin={{ left: 4, right: 8, top: 12, bottom: 0 }}
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
                tickMargin={6}
                tickFormatter={(v: number) => `#${v}`}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={28}
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
                strokeWidth={1.75}
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
    </section>
  );
}

function RangeToggles({
  value,
  onChange,
}: {
  value: Range;
  onChange: (next: Range) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
      {RANGES.map((r) => {
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            aria-pressed={active}
            className={cn(
              "transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-4 bg-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}
