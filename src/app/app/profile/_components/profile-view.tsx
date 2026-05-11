"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import type { HistorySummaryOutput } from "@/types/history";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";
import { ActivityHeatmap } from "./activity-heatmap";
import {
  deriveActivity,
  derivePersonalBests,
  deriveStreak,
  deriveTotals,
  deriveTrend,
  mergePersonalBestsWithMt,
  mergeTotalsWithMt,
} from "./derive-stats";
import { PersonalBests } from "./personal-bests";
import { ProfileHero } from "./profile-hero";
import { ProfileStats } from "./profile-stats";
import { RecentRuns } from "./recent-runs";
import { WpmTrend } from "./wpm-trend";

/** useRemotePrefs needs a non-null object default; an empty slice
 *  with importedAt=0 acts as the "never imported" sentinel that the
 *  merge helpers detect to short-circuit. */
const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** /app/profile/<username> orchestrator. One backend call
 *  (history.summary) feeds every panel — totals, streak, personal
 *  bests, activity heatmap, WPM trend, recent runs. The page is
 *  read-only and designed as a public profile view; account /
 *  sign-out controls live in /app/customise.
 *
 *  `username` comes from the URL slug. The hero displays it as the
 *  canonical handle. Today the data still comes from the signed-in
 *  user's own history (only one history endpoint is available); when
 *  cross-user history reads land, this is the place to swap in a
 *  username-scoped fetch. */
export function ProfileView({ username }: { username?: string }) {
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
          setError("Sign in to view your profile.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load profile.",
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

  const tests = snapshot?.recentTests ?? [];
  const { value: mtSliceRaw, update: updateMtSlice } =
    useRemotePrefs<MonkeytypeStatsSlice>("monkeytypeStats", EMPTY_MT_SLICE);
  const mtSlice = mtSliceRaw.importedAt > 0 ? mtSliceRaw : null;
  const hasStoredKey = mtSlice?.encryptedApiKey != null;

  // Auto-sync once per page load when a stored Ape Key exists. The
  // empty-input form of the import route decrypts the stored key
  // server-side and refreshes the slice. Failures stay silent —
  // last-known data continues to render.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!hasStoredKey || syncedRef.current) return;
    syncedRef.current = true;
    let cancelled = false;
    backend.monkeytype
      .import({})
      .then((out) => {
        if (cancelled) return;
        // Pipe the fresh slice back into the local prefs cache so
        // PBs / lifetime totals re-merge without a manual refresh.
        updateMtSlice(out.slice);
      })
      .catch(() => {
        // Stored key may be inactive / revoked. Don't spam errors;
        // the next manual import will surface the cause.
      });
    return () => {
      cancelled = true;
    };
  }, [hasStoredKey, backend, updateMtSlice]);

  const localTotals = useMemo(() => deriveTotals(tests), [tests]);
  const totals = useMemo(
    () => mergeTotalsWithMt(localTotals, mtSlice),
    [localTotals, mtSlice],
  );
  const streak = useMemo(() => deriveStreak(tests), [tests]);
  const localBests = useMemo(() => derivePersonalBests(tests), [tests]);
  const bests = useMemo(
    () => mergePersonalBestsWithMt(localBests, mtSlice),
    [localBests, mtSlice],
  );
  const activity = useMemo(() => deriveActivity(tests, 52), [tests]);
  const trend = useMemo(() => deriveTrend(tests, 60), [tests]);

  if (error) {
    return (
      <>
        <ProfileHero totals={totals} username={username} />
        <section className="px-5 py-12 sm:px-12 sm:py-14 lg:px-16">
          <p className="text-sm text-primary">{error}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <ProfileHero totals={totals} username={username} />
      <ProfileStats totals={totals} streak={streak} rank={null} />
      <PersonalBests bests={bests} />
      <ActivityHeatmap days={activity} streak={streak} />
      <WpmTrend points={trend} />
      <RecentRuns tests={tests} />
      {loading ? (
        <p className="px-5 pb-10 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-12 lg:px-16">
          Loading the rest of your history…
        </p>
      ) : null}
    </>
  );
}
