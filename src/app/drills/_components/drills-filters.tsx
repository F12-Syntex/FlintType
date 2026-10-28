"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  countTiles,
  DRILL_FILTERS,
  type DrillFilterId,
  type DrillTileGroups,
} from "./drill-tiles";

/** The drills filter: the shared segmented switch (ui-law §17.2).
 *  44px tall on phones (touch floor), 40px from md.
 *  On narrow screens the row scrolls sideways and bleeds to the screen
 *  edge so no option is cut off mid-label. Options with no matching
 *  tiles hide, except All and whichever option is active. */
export function DrillsFilters({
  groups,
  active,
  onChange,
}: {
  groups: DrillTileGroups;
  active: DrillFilterId;
  onChange: (next: DrillFilterId) => void;
}) {
  const options = DRILL_FILTERS.flatMap((filter) => {
    const count = countTiles(groups, filter.id);
    if (count === 0 && filter.id !== "all" && filter.id !== active) return [];
    return [
      {
        value: filter.id,
        label: <span className="whitespace-nowrap">{filter.label}</span>,
      },
    ];
  });

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <SegmentedControl
        ariaLabel="Filter drills"
        value={active}
        onValueChange={onChange}
        options={options}
        className="h-11 flex-nowrap md:h-10 [&>button]:h-full [&>button]:py-0"
      />
    </div>
  );
}
