"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { CatalogRow } from "./catalog-row";
import { buildDrills, type DrillSpec } from "./drills-data";
import { DrillsTopline } from "./drills-topline";

/** Drills picker. Loads the user's history snapshot, builds the
 *  catalog, then renders it as two flat lists ("tailored" and
 *  "generic"). The first ready tailored drill carries the
 *  `recommended` flag — that row picks up the brand spark, and the
 *  topline's Start-recommended CTA links straight at it. */
export function DrillsView() {
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSnapshot(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to load your weakness data.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load drills.");
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
      weakestPairs: snapshot?.weakestPairs ?? [],
      weakestTrigrams: snapshot?.weakestTrigrams ?? [],
      weakestWords: snapshot?.weakestWords ?? [],
      cold: snapshot?.cold ?? false,
      seed: Date.now(),
    });
  }, [snapshot]);

  const tailored = drills.filter((d) => d.category === "tailored");
  const generic = drills.filter((d) => d.category === "generic");
  const tailoredReady = tailored.filter((d) => d.ready);
  const tailoredLocked = tailored.filter((d) => !d.ready);
  const recommended = tailoredReady[0] ?? null;

  return (
    <>
      <DrillsTopline
        tailoredReady={tailoredReady.length}
        tailoredLocked={tailoredLocked.length}
        genericReady={generic.length}
        recommendedHref={recommended ? `/drills/${recommended.id}` : null}
        recommendedTitle={recommended?.title ?? null}
        loading={loading}
      />
      <section className="px-5 pt-8 pb-16 sm:px-12 lg:px-16">
        {loading ? (
          <p className="text-sm text-muted-foreground">Reading your model…</p>
        ) : error ? (
          <p className="text-sm text-primary">{error}</p>
        ) : (
          <div className="flex flex-col gap-10">
            <CatalogGroup label="Tailored to you">
              {tailored.map((d) => (
                <CatalogRow
                  key={d.id}
                  drill={d}
                  recommended={recommended?.id === d.id}
                />
              ))}
            </CatalogGroup>
            <CatalogGroup label="Generic">
              {generic.map((d) => (
                <CatalogRow key={d.id} drill={d} recommended={false} />
              ))}
            </CatalogGroup>
          </div>
        )}
      </section>
    </>
  );
}

function CatalogGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="flex flex-col">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </h2>
      </div>
      <div className="flex flex-col border-y border-foreground/10">
        {children}
      </div>
    </section>
  );
}
