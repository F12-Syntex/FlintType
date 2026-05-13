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
import { ProfileSection } from "./profile-section";

/** Personal bests, MonkeyType-style — Time / Words sub-strips with
 *  fixed standard amounts (15s/30s/60s/120s and 10/25/50/100). The
 *  category dropdown above slices by mode:
 *    ALL          — best across every mode
 *    CASUAL       — casual practice tests only
 *    MULTIPLAYER  — race-tagged tests only (populates once race
 *                   submissions are tagged in a future commit)
 *    PRACTICE     — adaptive practice (training mode)
 *  Empty cells render with `—` so the viewer sees what they haven't
 *  attempted yet — same invitational pattern MT uses.
 *
 *  Dropdown shape mirrors `<ModePicker>` on the race surface — same
 *  trigger styling, same checkmark+title+blurb item shape — so the
 *  product reads as one design language across pages. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const [filter, setFilter] = useState<Category>("all");

  const lookup = useMemo(() => buildLookup(bests, filter), [bests, filter]);

  return (
    <ProfileSection label="Personal bests">
      <div className="flex flex-col gap-6 sm:gap-8">
        <CategoryPicker value={filter} onChange={setFilter} />
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
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
      </div>
    </ProfileSection>
  );
}

type Category = "all" | "casual" | "multiplayer" | "practice";

const CATEGORY_ORDER: readonly Category[] = [
  "all",
  "casual",
  "multiplayer",
  "practice",
];

/** Maps each public category to the underlying mode strings the
 *  derive layer produces. `multiplayer` reserves a "race" mode for
 *  when race-finished tests get tagged; today it filters to nothing,
 *  which surfaces the same "no run yet" empty state as a cold
 *  category. */
const CATEGORY_MODES: Record<Category, readonly string[]> = {
  all: ["casual", "training", "race"],
  casual: ["casual"],
  multiplayer: ["race"],
  practice: ["training"],
};

const TIME_AMOUNTS = [15, 30, 60, 120] as const;
const WORDS_AMOUNTS = [10, 25, 50, 100] as const;

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

/** One-line categorical description per filter — surfaced in the
 *  dropdown item's blurb so the user reads what each mode covers
 *  before picking. Keep these short; they sit on a single row under
 *  the title. */
const CATEGORY_DETAIL: Record<Category, string> = {
  all: "Best across every mode",
  casual: "Casual practice tests only",
  multiplayer: "Race-tagged tests",
  practice: "Adaptive practice (training mode)",
};

/** Matches `<ModePicker>` (race surface) — the canonical dropdown
 *  chip in this app. Same trigger size + style + chevron, same
 *  item layout (checkmark + uppercase title + lowercase blurb). */
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
            "group inline-flex h-8 items-center gap-2 self-start rounded-md border border-border bg-background px-3",
            "text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground",
            "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "hover:border-foreground/40 hover:bg-accent/40",
          )}
        >
          <span>{prettyCategory(value)}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
            {CATEGORY_DETAIL[value]}
          </span>
          <ChevronDown
            size={11}
            aria-hidden
            className={cn(
              "ml-0.5 text-muted-foreground transition-transform duration-150",
              "group-data-[state=open]:rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-60 p-1"
      >
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
    <div className="flex flex-col gap-2 sm:gap-2.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:tracking-[0.18em]">
        {label}
      </span>
      <div className="overflow-hidden rounded-md border border-border bg-card/40">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
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
    <div className="flex flex-col gap-1.5 px-3 py-4 sm:gap-2 sm:px-4 sm:py-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:tracking-[0.18em]">
        <span className={cn("tabular-nums", empty ? "" : "text-foreground")}>
          {amount}
          {unit}
        </span>
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-bold tracking-[-0.04em] tabular-nums leading-none text-3xl sm:text-[44px]",
            empty ? "text-foreground/25" : "text-primary",
          )}
        >
          {empty ? "—" : Math.round(best.bestWpm)}
        </span>
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground sm:text-[11px]">
        {empty ? (
          <span className="text-muted-foreground/60">no run yet</span>
        ) : (
          <>
            {best.bestAccuracy.toFixed(1)}%{" "}
            <span className="text-muted-foreground/60">acc</span>
          </>
        )}
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
