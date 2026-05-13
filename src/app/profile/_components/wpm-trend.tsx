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

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
} satisfies ChartConfig;

type Range = "day" | "week" | "month" | "3months" | "all";
const RANGES: { id: Range; label: string; ms: number | null }[] = [
  { id: "day", label: "Last day", ms: 86_400_000 },
  { id: "week", label: "Last week", ms: 7 * 86_400_000 },
  { id: "month", label: "Last month", ms: 30 * 86_400_000 },
  { id: "3months", label: "Last 3 months", ms: 90 * 86_400_000 },
  { id: "all", label: "All time", ms: null },
];

/** WPM trend panel — the page's headline chart. Wide bordered card,
 *  taller than the other panels (h-56 sm:h-72) so the curve has room
 *  to read. Range toggles render as button chips beside the section
 *  label; tooltip on hover shows test index + date. The dashed
 *  reference line marks the running mean WPM across the slice. */
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
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-4 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            WPM trend
          </span>
        </div>
        <RangeToggles value={range} onChange={setRange} />
      </header>

      {filtered.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Not enough data in this range. Try a wider window.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
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
            className="aspect-auto h-56 w-full sm:h-64 lg:h-72"
          >
            <ComposedChart
              accessibilityLayer
              data={filtered}
              margin={{ left: 4, right: 12, top: 16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="wpmTrendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-wpm)"
                    stopOpacity={0.16}
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
                  strokeOpacity={0.3}
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
                strokeWidth={2}
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
    <div className="flex flex-wrap items-center gap-1.5">
      {RANGES.map((r) => {
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
              active
                ? "border-primary/40 bg-primary/[0.08] text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
