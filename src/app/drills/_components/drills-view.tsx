"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { buildDrills, type DrillSpec } from "./drills-data";
import { DrillsIndex } from "./drills-index";
import { DrillsSpotlight } from "./drills-spotlight";

/** Drills picker. Two acts:
 *    1) <DrillsSpotlight/> — editorial hero with the single
 *       recommended drill, big sample of its content, Start CTA.
 *    2) <DrillsIndex/> — dense scannable catalog of every drill,
 *       grouped tailored/generic, hairline-divided rows.
 *  The spotlight is the focal point; the index is the menu. No
 *  topline stats banner — the index header carries the "N drills"
 *  count inline, which is enough. */
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
  const recommended = tailored.find((d) => d.ready) ?? null;
  const cold = snapshot?.cold ?? false;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pt-10 pb-16 sm:px-8 sm:pt-14 lg:px-12 lg:pt-20">
      <DrillsSpotlight
        recommended={recommended}
        cold={cold}
        loading={loading}
      />
      {error ? (
        <p className="text-sm text-primary" role="alert">
          {error}
        </p>
      ) : (
        <DrillsIndex
          tailored={tailored}
          generic={generic}
          recommendedId={recommended?.id ?? null}
          loading={loading}
        />
      )}
    </div>
  );
}
