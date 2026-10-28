"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageSection, PageShell } from "@/components/page-shell";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { DrillTileCard } from "./drill-tile";
import {
  buildDrillTiles,
  type DrillFilterId,
  type DrillTile,
  pickRecommended,
  showRecommended,
  tileMatches,
  tileReady,
  tileTitle,
} from "./drill-tiles";
import { DrillsFilters } from "./drills-filters";
import { DrillsSkeleton } from "./drills-skeleton";
import {
  EmptyFilterState,
  ErrorState,
  LockedSummary,
  ReadyCount,
} from "./drills-states";
import { RecommendedDrill } from "./recommended-drill";
import { useDrills } from "./use-drills";

/** /drills: what to practise next, answer first. `useDrills` loads the
 *  catalogue; `drill-tiles.ts` picks the recommendation, folds the
 *  isolation drills into one tile and orders each group. The page reads
 *  top to bottom: Recommended → filter → Tailored to you → For
 *  everyone. The filter applies to the recommended tile too. While
 *  every tailored drill is still locked (a new account), For everyone
 *  comes first and the locked drills fold into one row, so the drills
 *  the user can start today lead. */
export function DrillsView() {
  const { prefs: appearance } = useAppearancePrefs();
  const { drills, error, loading, retry } = useDrills();
  const [filter, setFilter] = useState<DrillFilterId>("all");

  const recommended = useMemo(
    () => (drills ? pickRecommended(drills) : null),
    [drills],
  );
  const groups = useMemo(
    () => buildDrillTiles(drills ?? [], recommended?.id ?? null),
    [drills, recommended],
  );

  // Header count is per tile, the recommended one included.
  const allTiles = [...groups.tailored, ...groups.generic];
  const readyTiles = allTiles.filter(tileReady).length;
  const ready = readyTiles + (recommended ? 1 : 0);
  const locked = allTiles.length - readyTiles;

  const reps = appearance.burstReps;
  const tailored = groups.tailored.filter((t) => tileMatches(t, filter));
  const generic = groups.generic.filter((t) => tileMatches(t, filter));
  const recVisible = showRecommended(recommended, filter);
  const tailoredLocked = tailored.filter((t) => !tileReady(t)).length;
  const allLocked = tailored.length > 0 && tailoredLocked === tailored.length;

  const tailoredSection = tailored.length > 0 && (
    <PageSection
      key="tailored"
      id="tailored"
      title="Tailored to you"
      description={
        tailoredLocked > 0 && !allLocked
          ? "Built from your typing. Locked drills open up as you practise."
          : "Built from your typing."
      }
    >
      {allLocked ? (
        <LockedSummary titles={tailored.map(tileTitle)} />
      ) : (
        <TileGrid tiles={tailored} burstReps={reps} />
      )}
    </PageSection>
  );
  const genericSection = generic.length > 0 && (
    <PageSection
      key="everyone"
      id="everyone"
      title="For everyone"
      description="Curated sets that work from day one."
    >
      <TileGrid tiles={generic} burstReps={reps} />
    </PageSection>
  );

  return (
    <PageShell>
      <PageHeader
        title="Drills"
        description="Short, focused sets on the letter pairs and words that slow you down."
        aside={
          drills ? (
            <ReadyCount ready={ready} locked={locked} />
          ) : loading ? (
            <span
              aria-hidden
              className="h-8 w-36 rounded-pill bg-muted motion-safe:animate-pulse"
            />
          ) : null
        }
      />

      {error && !drills ? (
        <ErrorState error={error} onRetry={retry} />
      ) : !drills ? (
        <DrillsSkeleton />
      ) : (
        <>
          {recVisible ? (
            <RecommendedDrill drill={recommended} burstReps={reps} />
          ) : null}

          <div className="flex flex-col gap-6">
            <DrillsFilters
              groups={groups}
              recommended={recommended}
              active={filter}
              onChange={setFilter}
            />
            {tailored.length + generic.length === 0 && !recVisible ? (
              <EmptyFilterState onReset={() => setFilter("all")} />
            ) : (
              <div className="flex flex-col gap-10 sm:gap-12">
                {allLocked
                  ? [genericSection, tailoredSection]
                  : [tailoredSection, genericSection]}
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}

function TileGrid({
  tiles,
  burstReps,
}: {
  tiles: readonly DrillTile[];
  burstReps: number;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <li key={tile.key}>
          <DrillTileCard tile={tile} burstReps={burstReps} />
        </li>
      ))}
    </ul>
  );
}
