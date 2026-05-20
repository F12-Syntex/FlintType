"use client";

import { UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { CompareOutput, CompareSide } from "@/types/friends";

const NUM_FMT = new Intl.NumberFormat("en-US");

type Metric = {
  label: string;
  value: (s: CompareSide) => number;
  format: (n: number) => string;
};

const METRICS: Metric[] = [
  { label: "Best WPM", value: (s) => s.stats.bestWpm, format: (n) => String(n) },
  { label: "Best net WPM", value: (s) => s.stats.bestNetWpm, format: (n) => String(n) },
  {
    label: "Best accuracy",
    value: (s) => s.stats.bestAccuracy,
    format: (n) => `${n}%`,
  },
  {
    label: "Tests",
    value: (s) => s.stats.testsCompleted,
    format: (n) => NUM_FMT.format(n),
  },
];

/** Head-to-head card: the viewer's flinttype aggregates against the
 *  profile subject's. The higher value per row is inked + bold, the
 *  lower drops to muted — no coral, so the Follow CTA in the hero stays
 *  the page's single spark. Ties leave both inked. */
export function HeadToHead({ compare }: { compare: CompareOutput }) {
  const { me, them } = compare;
  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Head to head
      </span>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-x-3 gap-y-3">
        <Handle side={me} align="end" youLabel />
        <span aria-hidden className="pb-1 text-center text-[10px] text-muted-foreground">
          vs
        </span>
        <Handle side={them} align="start" />

        {METRICS.map((m) => {
          const mv = m.value(me);
          const tv = m.value(them);
          const meWins = mv > tv;
          const themWins = tv > mv;
          return (
            <div key={m.label} className="contents">
              <Value text={m.format(mv)} win={meWins} align="end" />
              <span className="px-1 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {m.label}
              </span>
              <Value text={m.format(tv)} win={themWins} align="start" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Handle({
  side,
  align,
  youLabel = false,
}: {
  side: CompareSide;
  align: "start" | "end";
  youLabel?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <span className="truncate text-[13px] font-semibold text-foreground">
        {youLabel ? "You" : side.name}
      </span>
      {side.tags.map((t) => (
        <UserTag key={t} tag={t} size="sm" />
      ))}
    </div>
  );
}

function Value({
  text,
  win,
  align,
}: {
  text: string;
  win: boolean;
  align: "start" | "end";
}) {
  return (
    <span
      className={cn(
        "text-xl tabular-nums sm:text-2xl",
        align === "end" ? "text-right" : "text-left",
        win
          ? "font-bold text-foreground"
          : "font-medium text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}
