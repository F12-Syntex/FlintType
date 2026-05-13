"use client";

import { useUser } from "@clerk/nextjs";
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
import { ProfileXp } from "./profile-xp";
import { RecentRuns } from "./recent-runs";
import { WpmTrend } from "./wpm-trend";

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** /profile/<username> orchestrator. Editorial single-column layout
 *  capped at `max-w-2xl` (672px). Each section reads as a paragraph
 *  with a hairline rule above it — no card surrounds, no nested
 *  borders. The data fetch and the owner/visitor branch are
 *  unchanged; only the rendering shape did. */
export function ProfileView({ username }: { username?: string }) {
  const backend = useBackend();
  const { user, isLoaded: userLoaded } = useUser();
  const isOwner = userLoaded ? matchesViewer(username, user) : null;

  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOwner == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetcher = isOwner
      ? backend.history.summary()
      : backend.history.publicProfile({ username: username! });
    fetcher
      .then((r) => {
        if (cancelled) return;
        setSnapshot(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to view your profile.");
        } else if (err instanceof BackendError && err.code === "NOT_FOUND") {
          setError(`No flinttype profile for @${username}.`);
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
  }, [backend, isOwner, username]);

  const tests = snapshot?.recentTests ?? [];
  const subjectMtSlice = snapshot?.monkeytype ?? null;
  const { value: mtSliceRaw, update: updateMtSlice } =
    useRemotePrefs<MonkeytypeStatsSlice>("monkeytypeStats", EMPTY_MT_SLICE);
  const ownMtSlice = mtSliceRaw.importedAt > 0 ? mtSliceRaw : null;
  const hasStoredKey = isOwner === true && ownMtSlice?.encryptedApiKey != null;

  // Auto-sync once per page load when a stored Ape Key exists AND the
  // viewer is the owner. Visitors never trigger MT sync.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!hasStoredKey || syncedRef.current) return;
    syncedRef.current = true;
    let cancelled = false;
    backend.monkeytype
      .import({})
      .then((out) => {
        if (cancelled) return;
        updateMtSlice(out.slice);
      })
      .catch(() => {
        /* stored key may be inactive — silent */
      });
    return () => {
      cancelled = true;
    };
  }, [hasStoredKey, backend, updateMtSlice]);

  const localTotals = useMemo(() => deriveTotals(tests), [tests]);
  const totals = useMemo(
    () => mergeTotalsWithMt(localTotals, subjectMtSlice),
    [localTotals, subjectMtSlice],
  );
  const streak = useMemo(() => deriveStreak(tests), [tests]);
  const localBests = useMemo(() => derivePersonalBests(tests), [tests]);
  const bests = useMemo(
    () => mergePersonalBestsWithMt(localBests, subjectMtSlice),
    [localBests, subjectMtSlice],
  );
  const activity = useMemo(() => deriveActivity(tests, 52), [tests]);
  const trend = useMemo(() => deriveTrend(tests, 60), [tests]);

  const heroIsOwner = isOwner === true;
  const subjectTags = snapshot?.tags ?? [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-5 py-12 sm:px-8 sm:py-16">
      <ProfileHero
        username={username}
        isOwner={heroIsOwner}
        tags={subjectTags}
      />
      <ProfileXp totals={totals} />

      {error ? (
        <p className="mt-12 border-t border-border/60 pt-10 text-sm text-primary">
          {error}
        </p>
      ) : (
        <>
          <ProfileStats totals={totals} streak={streak} rank={null} />
          <PersonalBests bests={bests} />
          <ActivityHeatmap days={activity} streak={streak} />
          <WpmTrend points={trend} />
          <RecentRuns tests={tests} />
        </>
      )}

      {loading && !error ? (
        <p className="mt-10 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Loading the rest of {heroIsOwner ? "your" : "their"} history…
        </p>
      ) : null}
    </main>
  );
}

/** True when the URL's username slug matches the signed-in user.
 *  Checks the trio of fall-back identities the redirect can produce
 *  (`user.username`, email-local-part, `user.id`) so the canonical
 *  /profile/<slug> URL marks the user as owner regardless of
 *  which fall-back the redirect picked. */
function matchesViewer(
  urlUsername: string | undefined,
  user: ReturnType<typeof useUser>["user"],
): boolean {
  if (!user) return false;
  if (!urlUsername) return true;
  const candidates = new Set<string>();
  if (user.username) candidates.add(user.username);
  const email = user.emailAddresses?.[0]?.emailAddress.split("@")[0];
  if (email) candidates.add(email);
  if (user.id) candidates.add(user.id);
  return candidates.has(urlUsername);
}
