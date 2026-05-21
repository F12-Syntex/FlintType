"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/line-chart";
import { cn } from "@/lib/utils";

export type SkillRadarSpoke = { key: string; label: string; value: number };

const chartConfig = {
  value: { label: "You", color: "var(--primary)" },
  baseline: { label: "Average", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

/** The skill radar, shared by the profile Skill panel and the /updates
 *  showcase card. Four (or N) spokes painted in the brand coral over a
 *  hairline polar grid; an optional `baseline` (the average-typist
 *  scores, keyed by spoke `key`) overlays a muted dashed series so the
 *  user's shape reads as a *comparison*, not an arbitrary blob. No glow
 *  (§13). `pointer-events-none` + outline suppression so a click never
 *  draws a focus box; `outerRadius` held back so labels never clip. */
export function SkillRadar({
  skills,
  baseline,
  compact = false,
  className,
}: {
  skills: SkillRadarSpoke[];
  baseline?: Record<string, number> | null;
  /** Tighter sizing for embedding in the profile hero without wasting
   *  space; the default (larger) is for the /updates showcase. */
  compact?: boolean;
  className?: string;
}) {
  const data = skills.map((s) => ({
    axis: s.label,
    value: s.value,
    baseline: baseline ? Math.round(baseline[s.key] ?? 0) : 0,
  }));
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ChartContainer
        config={chartConfig}
        className={cn(
          "pointer-events-none aspect-square w-full select-none [&_*]:outline-none",
          compact
            ? "h-[190px] max-w-[250px] sm:h-[210px]"
            : "h-[240px] max-w-[340px] sm:h-[280px]",
        )}
      >
        <RadarChart
          data={data}
          outerRadius={compact ? "66%" : "70%"}
          margin={{
            top: 10,
            right: compact ? 30 : 36,
            bottom: 10,
            left: compact ? 30 : 36,
          }}
        >
          <PolarGrid stroke="currentColor" strokeOpacity={0.12} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--muted-foreground)", fontSize: compact ? 10 : 11 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {baseline ? (
            <Radar
              dataKey="baseline"
              stroke="var(--color-baseline)"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              fill="none"
              isAnimationActive={false}
            />
          ) : null}
          <Radar
            dataKey="value"
            stroke="var(--color-value)"
            fill="var(--color-value)"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--color-value)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ChartContainer>
      {baseline ? (
        <div
          className={cn(
            "flex items-center gap-4 font-medium uppercase tracking-[0.14em] text-muted-foreground",
            compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-3 rounded-full bg-primary" />
            You
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-3 border-t border-dashed border-muted-foreground"
            />
            Average
          </span>
        </div>
      ) : null}
    </div>
  );
}
