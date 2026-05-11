"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import {
  DrillCard,
  FeaturedDrillCard,
  LockedDrillRow,
} from "./drill-card";
import { buildDrills, type DrillSpec } from "./drills-data";
import { DrillsHero } from "./drills-hero";

/** Drills picker page. Loads the user's history snapshot, builds the
 *  catalog, then lays it out in three movements:
 *    1) Hero with a live ready/locked stat strip
 *    2) Featured spotlight — the first ready tailored drill (the most
 *       relevant pick), surfaced as a bigger card so the user lands
 *       on a clear next action
 *    3) Tailored + Generic groups, with locked drills collapsed into
 *       a quiet single-row list at the bottom of their group so they
 *       don't take up full cards while waiting on data */
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
  const featured = tailoredReady[0] ?? null;
  const tailoredRest = featured
    ? tailoredReady.filter((d) => d.id !== featured.id)
    : tailoredReady;

  return (
    <>
      <DrillsHero
        tailoredReady={tailoredReady.length}
        tailoredLocked={tailoredLocked.length}
        genericReady={generic.length}
        loading={loading}
        cold={snapshot?.cold ?? false}
      />
      <section className="px-5 pt-10 pb-16 sm:px-16">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Reading your model…
          </p>
        ) : error ? (
          <p className="text-sm text-primary">{error}</p>
        ) : (
          <div className="flex flex-col gap-12 sm:gap-14">
            {featured ? <FeaturedDrillCard drill={featured} /> : null}

            <DrillsGroup
              label="Tailored to you"
              blurb="Built from the bigrams, trigrams, and whole words you keep stalling on. Locked entries surface what unlocks them."
              ready={tailoredRest}
              locked={tailoredLocked}
            />

            <DrillsGroup
              label="Generic"
              blurb="Curated word and sentence sets that work without a model. Warm-up runs and universal drills."
              ready={generic}
            />
          </div>
        )}
      </section>
    </>
  );
}

function DrillsGroup({
  label,
  blurb,
  ready,
  locked = [],
}: {
  label: string;
  blurb: string;
  ready: readonly DrillSpec[];
  locked?: readonly DrillSpec[];
}) {
  if (ready.length === 0 && locked.length === 0) return null;
  return (
    <section aria-label={label} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-[13px]">
            {label}
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground/85">
          {blurb}
        </p>
      </div>

      {ready.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ready.map((d) => (
            <DrillCard key={d.id} drill={d} />
          ))}
        </div>
      ) : null}

      {locked.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            Locked · waiting on more data
          </span>
          {locked.map((d) => (
            <LockedDrillRow key={d.id} drill={d} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
