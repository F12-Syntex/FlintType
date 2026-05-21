"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
} from "@/components/ui/line-chart";
import type { SkillAxis } from "./derive-stats";

const chartConfig = {
  value: { label: "Skill", color: "var(--primary)" },
} satisfies ChartConfig;

/** Skill section — the profile's headline "who is this typist" block: a
 *  four-spoke radar (Speed, Accuracy, Consistency, Endurance) painted in
 *  the brand coral over a hairline polar grid. Standalone — the shape IS
 *  the story, so there's no redundant value table beside it (the raw
 *  numbers live in the stats strip + Personal bests). Editorial, no glow
 *  (§13). The chart is `pointer-events-none` + outline-suppressed so a
 *  stray click never draws a focus box around it. `outerRadius` is held
 *  back from the edge so the axis labels never clip. */
export function SkillPanel({
  skills,
  enoughData,
}: {
  skills: SkillAxis[];
  enoughData: boolean;
}) {
  const data = skills.map((s) => ({ axis: s.label, value: s.value }));
  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      <header className="mb-2 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-4 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Skill
        </span>
      </header>

      {!enoughData ? (
        <p className="text-sm text-muted-foreground">
          Not enough runs yet to chart a skill profile. Complete a few tests and
          the shape fills in.
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="pointer-events-none mx-auto aspect-square h-[260px] w-full max-w-[360px] select-none sm:h-[300px] [&_*]:outline-none"
        >
          <RadarChart
            data={data}
            outerRadius="70%"
            margin={{ top: 12, right: 36, bottom: 12, left: 36 }}
          >
            <PolarGrid stroke="currentColor" strokeOpacity={0.12} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
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
      )}
    </section>
  );
}
