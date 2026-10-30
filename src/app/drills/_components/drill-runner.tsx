"use client";

import { useMemo } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { Burst1000Surface } from "./burst-1000-surface";
import { BurstSurface } from "./burst-surface";
import { drillUnit } from "./drill-spec-line";
import { ErrorState, Locked, NotFound, RunnerSkeleton } from "./runner-states";
import { SuddenDeathSurface } from "./sudden-death-surface";
import { useDrills } from "./use-drills";

/** Client half of `/drills/<id>`: resolves the id to one drill spec and
 *  mounts the runner for its kind. (The page is a server component so
 *  <AppChrome>, which reads the app version server-side, can wrap it.)
 *  The catalogue comes from `useDrills`, the same source as the index,
 *  because tailored specs read the signed-in user's typing data.
 *
 *  Every state renders inside the practice surface's centred column
 *  (`max-w-5xl`, no extra gutter) so the header and the typing area
 *  share the practice page's edges.
 *
 *  Loading shows a skeleton, an error offers sign-in or retry, an
 *  unknown id is not found, a locked drill says what it needs, and
 *  otherwise the drill runs. */
export function DrillRunner({ id }: { id: string }) {
  const { drills, error, loading, retry } = useDrills();
  const drill = useMemo(
    () => drills?.find((d) => d.id === id) ?? null,
    [drills, id],
  );
  const { prefs: appearance } = useAppearancePrefs();

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
      {loading ? (
        <RunnerSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : !drill ? (
        <NotFound id={id} />
      ) : !drill.ready ? (
        <Locked drill={drill} />
      ) : drill.kind === "sudden-death" ? (
        <SuddenDeathSurface
          title={drill.title}
          subtitle={drill.contextLabel}
          words={drill.words}
        />
      ) : drill.tracker === "common-1000" ? (
        <Burst1000Surface
          title={drill.title}
          subtitle={drill.contextLabel}
          thresholdWpm={drill.thresholdWpm}
          repsPerItem={
            drill.repsConfigurable ? appearance.burstReps : drill.repsPerItem
          }
        />
      ) : (
        <BurstSurface
          title={drill.title}
          subtitle={drill.contextLabel}
          items={drill.items}
          unit={drillUnit(drill)[0]}
          thresholdWpm={drill.thresholdWpm}
          repsPerItem={
            drill.repsConfigurable ? appearance.burstReps : drill.repsPerItem
          }
        />
      )}
    </div>
  );
}
