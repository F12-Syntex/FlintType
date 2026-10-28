"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, PageSection, PageShell } from "@/components/page-shell";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { DrillTileCard } from "./drill-tile";
import {
  buildDrillTiles,
  type DrillFilterId,
  type DrillTile,
  pickRecommended,
  tileMatches,
  tileReady,
} from "./drill-tiles";
import { buildDrills, type DrillSpec } from "./drills-data";
import { DrillsFilters } from "./drills-filters";
import { DrillsSkeleton } from "./drills-skeleton";
import {
  EmptyFilterState,
  ErrorState,
  type LoadError,
  ReadyCount,
} from "./drills-states";
import { RecommendedDrill } from "./recommended-drill";

/** /drills: what to practise next, answer first. One
 *  `history.summary()` call feeds `buildDrills`; `drill-tiles.ts`
 *  decides the recommendation, folds the isolation drills into one
 *  tile and orders each group. The page reads top to bottom:
 *  Recommended → filter → Tailored to you → For everyone. */
export function DrillsView() {
  const backend = useBackend();
  const { prefs: appearance } = useAppearancePrefs();
  const [snap, setSnap] = useState<HistorySummaryOutput | null>(null);
  // Shuffle seed for the generated passages, taken when the data lands
  // (not during render) so each visit gets a fresh selection.
  const [seed, setSeed] = useState(0);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<DrillFilterId>("all");

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSeed(Date.now());
        setSnap(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError({ message: "Sign in to load your drills.", signIn: true });
        } else if (err instanceof BackendError && err.code === "RATE_LIMITED") {
          setError({
            message: "Too many refreshes in a row. Wait a moment, then try again.",
            signIn: false,
          });
        } else {
          setError({
            message: err instanceof Error ? err.message : "Couldn't load drills.",
            signIn: false,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const drills = useMemo<DrillSpec[]>(
    () =>
      snap
        ? buildDrills({
            weakestPairs: snap.weakestPairs ?? [],
            weakestTrigrams: snap.weakestTrigrams ?? [],
            weakestWords: snap.weakestWords ?? [],
            cold: snap.cold ?? false,
            seed,
          })
        : [],
    [snap, seed],
  );

  const recommended = useMemo(() => pickRecommended(drills), [drills]);
  const groups = useMemo(
    () => buildDrillTiles(drills, recommended?.id ?? null),
    [drills, recommended],
  );

  // Header count is per visible tile, recommended included.
  const allTiles = [...groups.tailored, ...groups.generic];
  const ready = allTiles.filter(tileReady).length + (recommended ? 1 : 0);
  const locked = allTiles.length - allTiles.filter(tileReady).length;

  const tailored = groups.tailored.filter((t) => tileMatches(t, filter));
  const generic = groups.generic.filter((t) => tileMatches(t, filter));
  const reps = appearance.burstReps;

  return (
    <PageShell>
      <PageHeader
        title="Drills"
        description="Short, focused sets on the letter pairs and words that slow you down."
        aside={
          snap ? (
            <ReadyCount ready={ready} locked={locked} />
          ) : loading ? (
            <span
              aria-hidden
              className="h-8 w-36 rounded-pill bg-muted motion-safe:animate-pulse"
            />
          ) : null
        }
      />

      {error && !snap ? (
        <ErrorState error={error} onRetry={retry} />
      ) : !snap ? (
        <DrillsSkeleton />
      ) : (
        <>
          {recommended ? (
            <RecommendedDrill drill={recommended} burstReps={reps} />
          ) : null}

          <div className="flex flex-col gap-6">
            <DrillsFilters groups={groups} active={filter} onChange={setFilter} />
            {tailored.length + generic.length === 0 ? (
              <EmptyFilterState onReset={() => setFilter("all")} />
            ) : (
              <div className="flex flex-col gap-10 sm:gap-12">
                {tailored.length > 0 ? (
                  <TileSection
                    id="tailored"
                    title="Tailored to you"
                    description="Built from your typing. Locked drills open up as you practise."
                    tiles={tailored}
                    burstReps={reps}
                  />
                ) : null}
                {generic.length > 0 ? (
                  <TileSection
                    id="everyone"
                    title="For everyone"
                    description="Curated sets that work from day one."
                    tiles={generic}
                    burstReps={reps}
                  />
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}

function TileSection({
  id,
  title,
  description,
  tiles,
  burstReps,
}: {
  id: string;
  title: string;
  description: string;
  tiles: readonly DrillTile[];
  burstReps: number;
}) {
  return (
    <PageSection id={id} title={title} description={description}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.key}>
            <DrillTileCard tile={tile} burstReps={burstReps} />
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
