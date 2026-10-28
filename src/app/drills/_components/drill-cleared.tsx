"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

/** The clear screen every drill ends on: a short headline, two numbers
 *  and the same two actions, an orange "Run again" and an outline
 *  "Back to drills". Shared by the sudden-death and burst runners so a
 *  finish reads the same whichever kind of drill it was. */
export function DrillCleared({
  title,
  stats,
  onRetry,
}: {
  title: string;
  stats: readonly { label: string; value: string }[];
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-semibold text-primary">Drill clear</span>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
      </div>
      <dl className="flex items-start gap-10 sm:gap-12">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
            <dd className="text-2xl font-bold text-foreground tabular-nums">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={onRetry}>
          Run again
        </Button>
        <Link
          href="/drills"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Back to drills
        </Link>
      </div>
    </div>
  );
}
