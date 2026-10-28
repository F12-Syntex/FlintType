"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  type DrillFilterId,
  type DrillTileGroups,
  visibleFilters,
} from "./drill-tiles";
import type { DrillSpec } from "./drills-data";

/** The drills filter: the shared segmented switch (ui-law §17.2), the
 *  selected option an orange pill. Each segment is a 44px touch target
 *  on phones (40px control from md). On narrow screens the row scrolls
 *  sideways and bleeds to the screen edge so no option is cut off
 *  mid-label. Only options that narrow the page are offered (see
 *  `visibleFilters`); with nothing to narrow, the control hides. */
export function DrillsFilters({
  groups,
  recommended,
  active,
  onChange,
}: {
  groups: DrillTileGroups;
  recommended: DrillSpec | null;
  active: DrillFilterId;
  onChange: (next: DrillFilterId) => void;
}) {
  const options = visibleFilters(groups, recommended, active).map((f) => ({
    value: f.id,
    label: <span className="whitespace-nowrap">{f.label}</span>,
  }));
  if (options.length < 2) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <SegmentedControl
        ariaLabel="Filter drills"
        value={active}
        onValueChange={onChange}
        options={options}
        className="flex-nowrap max-md:p-0.5 max-md:[&>button]:h-11 max-md:[&>button]:px-4 md:h-10 md:[&>button]:h-full md:[&>button]:py-0"
      />
    </div>
  );
}
