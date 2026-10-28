"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { Burst1000Surface } from "./burst-1000-surface";
import { BurstSurface } from "./burst-surface";
import { buildDrills, type DrillSpec } from "./drills-data";
import {
  ErrorState,
  type LoadError,
  Locked,
  NotFound,
  RunnerSkeleton,
} from "./runner-states";
import { SuddenDeathSurface } from "./sudden-death-surface";

/** Client half of `/drills/<id>`: resolves the id to one drill spec and
 *  renders the runner that fits its kind. (The page itself is a server
 *  component so <AppChrome>, which reads the app version server-side,
 *  can wrap it.) The catalog is rebuilt from `backend.history.summary()`
 *  because the tailored specs (weakness, worst words, isolation, trigram
 *  burst when warm) read the signed-in user's data; the rest are
 *  deterministic.
 *
 *  Every state renders inside the practice surface's centred column
 *  (`max-w-5xl`, no extra gutter) so the header and the typing area
 *  share the practice page's edges.
 *
 *  Status flow:
 *    loading        — snapshot in flight (skeleton)
 *    error          — fetch failed (sign in, or retry)
 *    not-found      — id doesn't match any catalog spec
 *    locked         — id matches but the spec needs more user data
 *    ready          — render the matching surface (sudden-death / burst) */
export function DrillRunner({ id }: { id: string }) {
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  // Shuffle seed for the generated passages, taken when the data lands
  // (not during render) so each visit gets a fresh selection.
  const [seed, setSeed] = useState(0);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSeed(Date.now());
        setSnapshot(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError({ message: "Sign in to load this drill.", signIn: true });
        } else if (err instanceof BackendError && err.code === "RATE_LIMITED") {
          setError({
            message: "Too many requests in a row. Wait a moment, then try again.",
            signIn: false,
          });
        } else {
          setError({
            message: err instanceof Error ? err.message : "Couldn't load this drill.",
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

  const drill = useMemo<DrillSpec | null>(() => {
    if (!snapshot) return null;
    const drills = buildDrills({
      weakestPairs: snapshot.weakestPairs ?? [],
      weakestTrigrams: snapshot.weakestTrigrams ?? [],
      weakestWords: snapshot.weakestWords ?? [],
      cold: snapshot.cold ?? false,
      seed,
    });
    return drills.find((d) => d.id === id) ?? null;
  }, [snapshot, seed, id]);

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
          thresholdWpm={drill.thresholdWpm}
          repsPerItem={
            drill.repsConfigurable ? appearance.burstReps : drill.repsPerItem
          }
        />
      )}
    </div>
  );
}
