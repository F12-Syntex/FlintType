"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PersonalBest } from "./derive-stats";

const TIME_AMOUNTS = [15, 30, 60, 120] as const;
const WORDS_AMOUNTS = [10, 25, 50, 100] as const;

type Category = "all" | "casual" | "multiplayer" | "practice";
const CATEGORY_ORDER: readonly Category[] = [
  "all",
  "casual",
  "multiplayer",
  "practice",
];
const CATEGORY_MODES: Record<Category, readonly string[]> = {
  all: ["casual", "training", "race"],
  casual: ["casual"],
  multiplayer: ["race"],
  practice: ["training"],
};
const CATEGORY_DETAIL: Record<Category, string> = {
  all: "Best across every mode",
  casual: "Casual practice tests only",
  multiplayer: "Race-tagged tests",
  practice: "Adaptive practice (training mode)",
};

/** Personal bests — Time + Words strips, MonkeyType layout. The
 *  bordered card surround is gone; cells sit as bare numbers in a
 *  grid. Empty cells render `—` in `text-foreground/25` so the
 *  viewer sees what they haven't attempted yet. The category picker
 *  stays as a compact dropdown chip above the strips so the user
 *  can slice by mode without leaving the page. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const [filter, setFilter] = useState<Category>("all");
  const lookup = useMemo(() => buildLookup(bests, filter), [bests, filter]);

  return (
    <section className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionLabel>Personal bests</SectionLabel>
        <CategoryPicker value={filter} onChange={setFilter} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
        <SubStrip
          label="Time"
          unit="s"
          amounts={TIME_AMOUNTS}
          lookup={lookup}
        />
        <SubStrip
          label="Words"
          unit=""
          amounts={WORDS_AMOUNTS}
          lookup={lookup}
        />
      </div>
    </section>
  );
}

function buildLookup(
  bests: readonly PersonalBest[],
  filter: Category,
): Map<number, PersonalBest> {
  const allowed = new Set(CATEGORY_MODES[filter]);
  const out = new Map<number, PersonalBest>();
  for (const b of bests) {
    if (!allowed.has(b.mode)) continue;
    const existing = out.get(b.amount);
    if (!existing || b.bestWpm > existing.bestWpm) out.set(b.amount, b);
  }
  return out;
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (next: Category) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Personal bests filter — ${prettyCategory(value)}`}
          className={cn(
            "group inline-flex h-7 items-center gap-2 rounded-md border border-border bg-background px-2.5",
            "text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "hover:border-foreground/40 hover:bg-accent/40",
          )}
        >
          <span>{prettyCategory(value)}</span>
          <ChevronDown
            size={11}
            aria-hidden
            className={cn(
              "text-muted-foreground transition-transform",
              "group-data-[state=open]:rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-60 p-1">
        {CATEGORY_ORDER.map((id) => {
          const active = id === value;
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => onChange(id)}
              className={cn(
                "flex items-start gap-2.5 rounded-sm py-2 pl-2 pr-3",
                active && "bg-primary/[0.06]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center",
                  active ? "text-primary" : "text-transparent",
                )}
              >
                <Check size={13} strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.14em]",
                    active ? "text-primary" : "text-foreground",
                  )}
                >
                  {prettyCategory(id)}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {CATEGORY_DETAIL[id]}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SubStrip({
  label,
  unit,
  amounts,
  lookup,
}: {
  label: string;
  unit: string;
  amounts: readonly number[];
  lookup: Map<number, PersonalBest>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {amounts.map((amt) => (
          <BestCell
            key={amt}
            amount={amt}
            unit={unit}
            best={lookup.get(amt) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function BestCell({
  amount,
  unit,
  best,
}: {
  amount: number;
  unit: string;
  best: PersonalBest | null;
}) {
  const empty = best == null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
        {amount}
        {unit}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tracking-[-0.04em] leading-none tabular-nums sm:text-[28px]",
          empty ? "text-foreground/25" : "text-primary",
        )}
      >
        {empty ? "—" : Math.round(best.bestWpm)}
      </span>
      {!empty ? (
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground/80">
          {best.bestAccuracy.toFixed(1)}%
        </span>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-4 bg-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

function prettyCategory(c: Category): string {
  if (c === "all") return "All";
  if (c === "casual") return "Casual";
  if (c === "multiplayer") return "Multiplayer";
  if (c === "practice") return "Practice";
  return c;
}
