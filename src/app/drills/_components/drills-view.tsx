"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";
import { DrillCell } from "./drill-cell";
import { buildDrills, type DrillSpec } from "./drills-data";
import {
  type DrillFilterId,
  DrillsFilters,
  matchesFilter,
} from "./drills-filters";
import { DrillsHero } from "./drills-hero";
import { DrillsSection } from "./drills-section";

/** /drills orchestrator. Loads the history snapshot once, builds the
 *  drill list via `buildDrills`, then renders a single chip-filtered
 *  bento. Adding a new drill is one push to `buildDrills`; adding a
 *  new filter axis is one row in `DRILL_FILTERS`. The two halves stay
 *  independent — the data layer doesn't know about filters, the filter
 *  layer doesn't care how drills are built. */
export function DrillsView() {
  const backend = useBackend();
  const [snap, setSnap] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DrillFilterId>("all");

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSnap(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to load your weakness data.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load drills.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const drills = useMemo<DrillSpec[]>(() => {
    return buildDrills({
      weakestPairs: snap?.weakestPairs ?? [],
      weakestTrigrams: snap?.weakestTrigrams ?? [],
      weakestWords: snap?.weakestWords ?? [],
      cold: snap?.cold ?? false,
      seed: Date.now(),
    });
  }, [snap]);

  const ready = drills.filter((d) => d.ready).length;
  const locked = drills.length - ready;
  const recommended = drills.find((d) => d.category === "tailored" && d.ready) ?? null;
  const visible = drills.filter((d) => matchesFilter(d, filter));

  return (
    <>
      <DrillsHero ready={ready} locked={locked} loading={loading} />

      {error ? (
        <section className="px-5 py-12 sm:px-12 lg:px-16">
          <p className="text-sm text-primary" role="alert">
            {error}
          </p>
        </section>
      ) : loading ? (
        <section className="px-5 py-12 sm:px-12 lg:px-16">
          <p className="text-sm text-muted-foreground">Reading your model…</p>
        </section>
      ) : (
        <DrillsSection
          label="Drills"
          subtitle="Filter to find the drill you want. Tailored drills come from your typing model and unlock as it warms up. Generic drills work for everyone."
          noBorder
        >
          <div className="flex flex-col gap-6">
            <DrillsFilters drills={drills} active={filter} onChange={setFilter} />
            {visible.length === 0 ? (
              <EmptyFilterState />
            ) : (
              <DrillBento drills={visible} recommendedId={recommended?.id ?? null} />
            )}
          </div>
        </DrillsSection>
      )}
    </>
  );
}

function EmptyFilterState() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-card px-5 py-6">
      <p className="text-sm text-foreground">No drills match that filter yet.</p>
      <p className="text-[12.5px] text-muted-foreground">
        Try another chip, or come back once your model has warmed up.
      </p>
    </div>
  );
}

/** Consistent-size card grid. Three discrete cards per row on lg+
 *  (one on mobile, two on sm), each carrying its own border on the
 *  page background. Partial last rows leave page-bg, not the hairline
 *  bg-border the prior wrapper bento showed through. Every card has
 *  the same width and `min-h-[14rem]` so the grid rhythm stays even
 *  when titles or descriptions vary. */
function DrillBento({
  drills,
  recommendedId,
}: {
  drills: readonly DrillSpec[];
  recommendedId: string | null;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",
      )}
    >
      {drills.map((d) => (
        <DrillCell
          key={d.id}
          drill={d}
          recommended={recommendedId === d.id}
        />
      ))}
    </div>
  );
}
