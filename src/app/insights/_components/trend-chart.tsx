"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, Scatter, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/line-chart";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { dateShort } from "@/lib/format-figure";
import { chartLabel, legendLabels, tooltipLines, type TrendView } from "./trend-copy";
import { drawnMarks, type TrendRow, yScale } from "./trend-data";
import { dateTicks, maxDateTicks } from "./trend-ticks";

/** Ink only (spec-40 §3.5, dataviz): a faint usual-range band, the
 *  rolling median as a 2px line, each test (or day) as a faint dot
 *  ringed in the card colour, and personal bests as solid dots. No
 *  orange: the page's orange belongs to its action. The table twin
 *  below lists the same points; the tooltip only adds to it.
 *
 *  On an adjusted (Adapt) chart no dot is marked as a best: bests are
 *  typed speeds, and the dots sit at the adjusted figure, so a best
 *  could land mid-cloud (trend-copy.ts). The line and band need 2
 *  points each, the same rule as the legend. */
const config = {
  median: { label: legendLabels({ adjusted: false, daily: false }).median, color: "var(--foreground)" },
} satisfies ChartConfig;

type Plotted = TrendRow & { test: number | null; best: number | null };

/** The chart's width in px (null until measured), so a phone gets fewer
 *  date labels than a laptop. */
function useWidth(): [RefObject<HTMLDivElement | null>, number | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? null));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function Dot({ cx, cy, solid }: { cx?: number; cy?: number; solid: boolean }) {
  if (cx === undefined || cy === undefined || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--foreground)"
      fillOpacity={solid ? 1 : 0.35}
      stroke="var(--card)"
      strokeWidth={2}
    />
  );
}

function TrendTooltip({
  active,
  payload,
  unit,
  view,
}: {
  active?: boolean;
  payload?: readonly { payload?: Plotted }[];
  unit: TypingSpeedUnit;
  view: TrendView;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const lines = tooltipLines(row, view, unit);
  return (
    <div className="grid min-w-40 gap-0.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-float">
      <span className="text-muted-foreground">{lines.when}</span>
      <span className="font-semibold tabular-nums text-foreground">{lines.figure}</span>
      {lines.notes.map((n) => (
        <span key={n} className="text-muted-foreground">
          {n}
        </span>
      ))}
    </div>
  );
}

export function TrendChart({
  rows,
  unit,
  view,
}: {
  rows: TrendRow[];
  unit: TypingSpeedUnit;
  view: TrendView;
}) {
  const marked = (r: TrendRow) => r.pb && !view.adjusted;
  const data: Plotted[] = rows.map((r) => ({ ...r, test: marked(r) ? null : r.value, best: marked(r) ? r.value : null }));
  const [box, width] = useWidth();
  const ticks = dateTicks(rows.map((r) => r.t), maxDateTicks(width));
  const drawn = drawnMarks(rows);
  const y = yScale(rows, drawn);
  const decimals = y.ticks.some((t) => !Number.isInteger(t));
  return (
    <div ref={box} className="w-full">
      <ChartContainer
        config={config}
        role="img"
        aria-label={chartLabel(view)}
        className="aspect-auto h-[220px] w-full sm:h-[260px]"
      >
        <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            interval={0}
            tickFormatter={(t: number) => dateShort(t)}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            width={32}
            domain={y.domain}
            ticks={y.ticks}
            interval={0}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v: number) => (decimals ? String(Math.round(v * 100) / 100) : String(Math.round(v)))}
            className="tabular-nums"
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={<TrendTooltip unit={unit} view={view} />}
          />
          {drawn.band ? (
            <Area
              dataKey="band"
              type="monotone"
              stroke="none"
              fill="var(--foreground)"
              fillOpacity={0.08}
              connectNulls
              activeDot={false}
              isAnimationActive={false}
            />
          ) : null}
          {drawn.median ? (
            <Line
              dataKey="median"
              type="monotone"
              stroke="var(--foreground)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
          ) : null}
          <Scatter dataKey="test" shape={(p: { cx?: number; cy?: number }) => <Dot cx={p.cx} cy={p.cy} solid={false} />} isAnimationActive={false} />
          <Scatter dataKey="best" shape={(p: { cx?: number; cy?: number }) => <Dot cx={p.cx} cy={p.cy} solid />} isAnimationActive={false} />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
