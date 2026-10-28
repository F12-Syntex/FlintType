"use client";

import { PageSection, Surface } from "@/components/page-shell";
import { SkillRadar } from "@/components/skill-radar";
import { SKILL_BASELINE } from "@/lib/skill-baseline";
import { ActivityHeatmap } from "./activity-heatmap";
import type { DayCell, SkillAxis, StreakStats } from "./derive-stats";

/** One card split between **Activity** (the heatmap, ~60%) and **Skill**
 *  (the compact radar against the average baseline, ~40%). Both halves
 *  stretch to the same height and spread their header / body / legend
 *  with `justify-between`, so the two legends share a baseline and no
 *  dead space pools under the heatmap. Stacks on phones. */
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
    <PageSection
      id="activity"
      title="Activity and skill"
      description="When you type, and the shape of your typing."
    >
      <Surface className="grid overflow-hidden md:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 p-5 sm:p-6">
          <ActivityHeatmap days={days} streak={streak} />
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-border/60 p-5 sm:p-6 md:border-t-0 md:border-l">
          <header className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-foreground">Skill</h3>
            <p className="text-xs text-muted-foreground">
              Compared with the average typist
            </p>
          </header>
          {enoughSkill ? (
            <SkillRadar
              skills={skills}
              baseline={SKILL_BASELINE}
              compact
              className="flex-1 justify-between"
            />
          ) : (
            <p className="flex-1 text-sm text-muted-foreground">
              Finish a few tests and your skill shape fills in here.
            </p>
          )}
        </div>
      </Surface>
    </PageSection>
  );
}
