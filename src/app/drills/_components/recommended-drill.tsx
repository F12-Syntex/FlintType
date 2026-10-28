"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KindBadge } from "./drill-tile";
import { drillSpecLine } from "./drill-tiles";
import type { DrillSpec } from "./drills-data";

/** The page's one answer: the drill to do next. Full width, the only
 *  orange on /drills (a warm wash, an orange border and the flame CTA),
 *  so the eye lands here before the grid. The Start button is the
 *  page's single filled primary action. */
export function RecommendedDrill({
  drill,
  burstReps,
}: {
  drill: DrillSpec;
  burstReps: number;
}) {
  return (
    <section
      aria-labelledby="recommended-drill"
      className="flex flex-col gap-5 rounded-2xl border border-primary/30 bg-linear-to-br from-primary/10 via-card to-card p-5 text-card-foreground shadow-card sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6 lg:p-8"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary [&_svg]:size-3.5">
          <Flame aria-hidden />
          Recommended for you
        </span>
        <h2
          id="recommended-drill"
          className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {drill.title}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {drill.summary}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <KindBadge drill={drill} />
          <span className="text-xs tabular-nums text-muted-foreground">
            {drillSpecLine(drill, burstReps)}
          </span>
        </div>
      </div>
      <Link
        href={`/drills/${drill.id}`}
        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
      >
        Start drill
      </Link>
    </section>
  );
}
