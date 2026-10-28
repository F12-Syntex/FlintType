"use client";

import { useMemo, useState } from "react";
import { PageSection, Surface } from "@/components/page-shell";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { PersonalBest } from "./derive-stats";
import {
  type BestsCategory,
  type BestsUnit,
  CATEGORY_MODES,
  TIME_AMOUNTS,
  WORDS_AMOUNTS,
  indexBestsByAmount,
} from "./personal-best-lookup";

const CATEGORIES: readonly { value: BestsCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "casual", label: "Casual" },
  { value: "practice", label: "Adapt" },
  { value: "multiplayer", label: "Races" },
];

/** What an empty category says (one line instead of eight dashes). */
const EMPTY_LABEL: Record<BestsCategory, string> = {
  all: "No runs at these lengths yet.",
  casual: "No Casual runs at these lengths yet.",
  practice: "No Adapt runs at these lengths yet.",
  multiplayer: "No races at these lengths yet.",
};

/** Shared sizing for the section switches on the profile. Phones: full
 *  width, equal segments, each segment a 44px touch target (the track
 *  grows around them). From `sm`: a hugging 40px track. Exported so the
 *  trend's range switch matches exactly. */
export const SECTION_SWITCH =
  "w-full flex-nowrap p-0.5 sm:h-10 sm:w-auto sm:p-1 [&>button]:min-h-11 [&>button]:flex-1 [&>button]:py-0 sm:[&>button]:h-full sm:[&>button]:min-h-0 sm:[&>button]:flex-none";

/** Personal bests: a Time strip and a Words strip, four lengths each.
 *  Values are ink — the hero's Best WPM is the page's one orange number.
 *  A length the player hasn't finished shows a single muted dash. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const [filter, setFilter] = useState<BestsCategory>("all");
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
  // The maps hold only tile lengths, so empty maps mean every tile is a dash.
  const empty = time.size === 0 && words.size === 0;

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
      {empty ? (
        <Surface className="flex flex-col gap-1 px-5 py-8 sm:px-6">
          <p className="text-sm font-medium text-foreground">
            {EMPTY_LABEL[filter]}
          </p>
          <p className="text-sm text-muted-foreground">
            Bests show for 15, 30, 60 and 120 second tests, and 10, 25, 50
            and 100 word tests.
          </p>
        </Surface>
      ) : (
        <Surface className="grid gap-6 p-5 sm:p-6 md:grid-cols-2 md:gap-10">
          <Strip label="Time" unit="time" amounts={TIME_AMOUNTS} lookup={time} />
          <Strip
            label="Words"
            unit="words"
            amounts={WORDS_AMOUNTS}
            lookup={words}
          />
        </Surface>
      )}
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
          <span className="text-2xl font-semibold leading-none text-muted-foreground/50 sm:text-[28px]">
            <span aria-hidden>—</span>
            <span className="sr-only">No run yet</span>
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
