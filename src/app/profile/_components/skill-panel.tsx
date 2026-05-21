"use client";

import { SkillRadar } from "@/components/skill-radar";
import { SKILL_BASELINE } from "@/lib/skill-baseline";
import type { SkillAxis } from "./derive-stats";

/** Skill section — the profile's "who is this typist" block: a four-spoke
 *  radar (Speed, Accuracy, Consistency, Endurance) overlaid against the
 *  average-typist baseline so the shape reads as a comparison. The radar
 *  itself is the shared `<SkillRadar>` (also used by the /updates card);
 *  this is just the section chrome + the not-enough-data guard. */
export function SkillPanel({
  skills,
  enoughData,
}: {
  skills: SkillAxis[];
  enoughData: boolean;
}) {
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
        <SkillRadar skills={skills} baseline={SKILL_BASELINE} className="mt-2" />
      )}
    </section>
  );
}
