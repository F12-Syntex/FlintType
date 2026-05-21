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

/** The skill radar — a five-spoke shape (Speed, Accuracy, Consistency,
 *  Endurance, Experience) painted in the brand coral over a hairline
 *  polar grid. Editorial, no glow (the recharts demo's glow filter is
 *  off-brand). Reuses the shared ChartContainer rather than a duplicate
 *  chart wrapper. */
function SkillRadar({ skills }: { skills: SkillAxis[] }) {
  const data = skills.map((s) => ({ axis: s.label, value: s.value }));
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-[230px] w-full max-w-[280px] sm:h-[260px]"
    >
      <RadarChart data={data} margin={{ top: 10, right: 18, bottom: 10, left: 18 }}>
        <PolarGrid stroke="currentColor" strokeOpacity={0.12} />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
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
  );
}

/** Skill section — the profile's headline "who is this typist" block,
 *  built to read at a glance even for a visitor who's never used
 *  flinttype: the radar shape on one side, the real numbers on the
 *  other. Hidden-by-emptiness is handled by the caller; here a sparse
 *  profile shows a calm "not enough data" note instead of a flat shape. */
export function SkillPanel({
  skills,
  enoughData,
}: {
  skills: SkillAxis[];
  enoughData: boolean;
}) {
  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      <header className="mb-4 flex items-center gap-3">
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
        <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
          <SkillRadar skills={skills} />
          <ul className="flex flex-col divide-y divide-border/60">
            {skills.map((s) => (
              <li
                key={s.key}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {s.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {s.display}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
