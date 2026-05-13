"use client";

import { useMemo, useState } from "react";
import { OptionSwitch } from "@/components/ui/option-switch";
import { cn } from "@/lib/utils";
import type { PersonalBest } from "./derive-stats";
import { ProfileSection } from "./profile-section";

/** Personal bests, MonkeyType-style — Time / Words sub-strips with
 *  fixed standard amounts (15s/30s/60s/120s and 10/25/50/100). The
 *  switch above lets the viewer slice by category:
 *    ALL          — best across every mode
 *    CASUAL       — casual practice tests only
 *    MULTIPLAYER  — race-tagged tests only (populates once race
 *                   submissions are tagged in a future commit)
 *    PRACTICE     — adaptive practice (training mode)
 *  Empty cells render with `—` so the user sees what they haven't
 *  attempted yet — same invitational pattern MT uses. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const [filter, setFilter] = useState<Category>("all");

  const lookup = useMemo(() => buildLookup(bests, filter), [bests, filter]);

  return (
    <ProfileSection label="Personal bests">
      <div className="flex flex-col gap-6 sm:gap-8">
        <CategorySwitch value={filter} onChange={setFilter} />
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

/** Routed through `<OptionSwitch>` (the canonical segmented control
 *  used by the practice mode-bar) instead of hand-rolling another
 *  tab strip — keeps the multi-option picker visually uniform across
 *  the app. */
function CategorySwitch({
  value,
  onChange,
}: {
  value: Category;
  onChange: (next: Category) => void;
}) {
  return (
    <OptionSwitch
      name="personal-bests-category"
      size="small"
      value={value}
      onValueChange={(v) => onChange(v as Category)}
    >
      {CATEGORY_ORDER.map((id) => (
        <OptionSwitch.Control
          key={id}
          value={id}
          label={prettyCategory(id)}
        />
      ))}
    </OptionSwitch>
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
