"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { ActivityHeatmap } from "./activity-heatmap";
import {
  deriveActivity,
  derivePersonalBests,
  deriveStreak,
  deriveTotals,
  deriveTrend,
} from "./derive-stats";
import { PersonalBests } from "./personal-bests";
import { ProfileHero } from "./profile-hero";
import { ProfileStats } from "./profile-stats";
import { RecentRuns } from "./recent-runs";
import { WpmTrend } from "./wpm-trend";

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
  const totals = useMemo(() => deriveTotals(tests), [tests]);
  const streak = useMemo(() => deriveStreak(tests), [tests]);
  const bests = useMemo(() => derivePersonalBests(tests), [tests]);
  const activity = useMemo(() => deriveActivity(tests, 52), [tests]);
  const trend = useMemo(() => deriveTrend(tests, 60), [tests]);

  if (error) {
    return (
      <>
        <ProfileHero totals={totals} username={username} />
        <section className="px-5 py-10 sm:px-16">
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
      <ActivityHeatmap days={activity} />
      <WpmTrend points={trend} />
      <RecentRuns tests={tests} />
      {loading ? (
        <p className="px-5 pb-10 text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:px-16">
          Loading the rest of your history…
        </p>
      ) : null}
    </>
  );
}
