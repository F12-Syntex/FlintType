"use client";

import { useMemo, useState } from "react";
import { PageSection, Surface } from "@/components/page-shell";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { PersonalBest } from "./derive-stats";
import { type BestsUnit, indexBestsByAmount } from "./personal-best-lookup";

const TIME_AMOUNTS = [15, 30, 60, 120] as const;
const WORDS_AMOUNTS = [10, 25, 50, 100] as const;

type Category = "all" | "casual" | "practice" | "multiplayer";

const CATEGORIES: readonly { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "casual", label: "Casual" },
  { value: "practice", label: "Adapt" },
  { value: "multiplayer", label: "Races" },
];

const CATEGORY_MODES: Record<Category, readonly string[]> = {
  all: ["casual", "training", "race"],
  casual: ["casual"],
  multiplayer: ["race"],
  practice: ["training"],
};

/** Shared sizing for the section switches on the profile: a 44px touch
 *  target on phones (full width, equal segments), 40px and hugging from
 *  `sm`. Exported so the trend's range switch matches exactly. */
export const SECTION_SWITCH =
  "h-11 w-full flex-nowrap sm:h-10 sm:w-auto [&>button]:h-full [&>button]:flex-1 [&>button]:py-0 sm:[&>button]:flex-none";

/** Personal bests: a Time strip and a Words strip, four lengths each.
 *  Values are ink — the hero's Best WPM is the page's one orange number.
 *  A length the player hasn't finished shows a single muted dash. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const [filter, setFilter] = useState<Category>("all");
  const modes = CATEGORY_MODES[filter];
  const time = useMemo(
    () => indexBestsByAmount(bests, { modes, unit: "time", amounts: TIME_AMOUNTS }),
    [bests, modes],
  );
  const words = useMemo(
    () =>
      indexBestsByAmount(bests, { modes, unit: "words", amounts: WORDS_AMOUNTS }),
    [bests, modes],
  );

  return (
    <PageSection
      id="personal-bests"
      title="Personal bests"
      description="Fastest finished run at each length."
      actions={
        <SegmentedControl
          ariaLabel="Personal bests mode"
          value={filter}
          onValueChange={setFilter}
          options={CATEGORIES}
          className={SECTION_SWITCH}
        />
      }
    >
      <Surface className="grid gap-6 p-5 sm:p-6 md:grid-cols-2 md:gap-10">
        <Strip label="Time" unit="time" amounts={TIME_AMOUNTS} lookup={time} />
        <Strip
          label="Words"
          unit="words"
          amounts={WORDS_AMOUNTS}
          lookup={words}
        />
      </Surface>
    </PageSection>
  );
}

function Strip({
  label,
  unit,
  amounts,
  lookup,
}: {
  label: string;
  unit: BestsUnit;
  amounts: readonly number[];
  lookup: Map<number, PersonalBest>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <dl className="grid grid-cols-4 gap-2">
        {amounts.map((amt) => (
          <BestCell
            key={amt}
            label={unit === "time" ? `${amt}s` : `${amt}`}
            best={lookup.get(amt) ?? null}
          />
        ))}
      </dl>
    </div>
  );
}

function BestCell({
  label,
  best,
}: {
  label: string;
  best: PersonalBest | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted/50 px-3 py-3 sm:px-4">
      <dt className="text-xs font-medium tabular-nums text-muted-foreground">
        {label}
      </dt>
      <dd className="flex flex-col gap-1">
        {best == null ? (
          <span
            aria-label="No run yet"
            className="text-2xl font-semibold leading-none text-muted-foreground/50 sm:text-[28px]"
          >
            —
          </span>
        ) : (
          <span className="text-2xl font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground sm:text-[28px]">
            {Math.round(best.bestWpm)}
          </span>
        )}
        {/* Always reserve the accuracy line so every tile is the same
         *  height, filled or not. */}
        <span className="min-h-4 text-xs tabular-nums text-muted-foreground">
          {best == null ? "" : `${best.bestAccuracy.toFixed(1)}%`}
        </span>
      </dd>
    </div>
  );
}
