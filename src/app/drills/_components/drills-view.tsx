"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";
import { DrillCell } from "./drill-cell";
import { buildDrills, type DrillSpec } from "./drills-data";
import { DrillsHero } from "./drills-hero";
import { DrillsSection } from "./drills-section";

/** /drills orchestrator. Loads the history snapshot once, then lays
 *  out two hairline bento sections (Tailored / Generic). Reads as a
 *  twin of /insights — same hero shape, same section primitive, same
 *  bento mechanics — so the user moves between the two pages without
 *  re-orienting. The recommended drill is one cell in the Tailored
 *  bento, tinted primary; everything else stays neutral. */
export function DrillsView() {
  const backend = useBackend();
  const [snap, setSnap] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const tailored = drills.filter((d) => d.category === "tailored");
  const generic = drills.filter((d) => d.category === "generic");
  const ready = drills.filter((d) => d.ready).length;
  const locked = drills.length - ready;
  const recommended = tailored.find((d) => d.ready) ?? null;

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
        <>
          <DrillsSection
            label="Tailored"
            subtitle="Built from your slowest pairs, trigrams, and words. Locked entries surface as soon as the model has enough signal."
          >
            <DrillBento drills={tailored} recommendedId={recommended?.id ?? null} />
          </DrillsSection>

          <DrillsSection
            label="Generic"
            subtitle="Curated drills that always work — pangrams, tongue-twisters, the top-100 sprint, the long-running 1000-word burst."
            noBorder
          >
            <DrillBento drills={generic} recommendedId={null} />
          </DrillsSection>
        </>
      )}
    </>
  );
}

/** Hairline bento. Columns auto-fit on a 300px minmax so the last
 *  row's cells stretch to fill the available width — avoids the
 *  empty-slot bg-border artifact you'd see with a fixed grid-cols-3
 *  when a row isn't full. Cells share borders via `gap-px` over a
 *  `bg-border` wrapper; each cell paints `bg-background` so only the
 *  1px margins between cells remain visible. */
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
        "grid gap-px overflow-hidden rounded-md border border-border bg-border",
      )}
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      }}
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
