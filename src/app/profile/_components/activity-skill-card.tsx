"use client";

import { SkillRadar } from "@/components/skill-radar";
import { SKILL_BASELINE } from "@/lib/skill-baseline";
import { ActivityHeatmap } from "./activity-heatmap";
import type { DayCell, SkillAxis, StreakStats } from "./derive-stats";

/** A single card split between **Activity** (the 52-week heatmap) and
 *  **Skill** (the radar against the average baseline). On md+ they sit
 *  side by side (activity ~60% / skill ~40%) divided by a hairline; on
 *  mobile they stack, divided by a top border. */
export function ActivitySkillCard({
  days,
  streak,
  skills,
  enoughSkill,
}: {
  days: DayCell[];
  streak: StreakStats;
  skills: SkillAxis[];
  enoughSkill: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="grid md:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-5">
          <ActivityHeatmap days={days} streak={streak} bare />
        </div>
        <div className="border-t border-border/60 px-4 py-4 sm:px-6 sm:py-5 md:border-l md:border-t-0">
          <header className="mb-3 flex items-center gap-3">
            <span aria-hidden className="inline-block h-px w-4 bg-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Skill
            </span>
          </header>
          {enoughSkill ? (
            <SkillRadar skills={skills} baseline={SKILL_BASELINE} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Not enough runs yet to chart a skill profile. Complete a few tests
              and the shape fills in.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
