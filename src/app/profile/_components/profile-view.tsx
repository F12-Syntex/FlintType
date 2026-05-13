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
import { RecentRuns } from "./recent-runs";
import { WpmTrend } from "./wpm-trend";

/** useRemotePrefs needs a non-null object default; an empty slice
 *  with importedAt=0 acts as the "never imported" sentinel that the
 *  merge helpers detect to short-circuit. */
const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** /profile/<username> orchestrator. Fans one history fetch out
 *  to every panel — totals, streak, PBs, activity, trend, recent
 *  runs. Public-friendly: viewers can read another user's profile
 *  without an account; the owner-only chrome (Edit, MonkeyType
 *  manage, Sign out) is gated client-side via `isOwner`.
 *
 *  Two fetch paths:
 *    - own profile: history.summary (auth-required, signed-in user
 *      is the subject). MT auto-sync runs here too.
 *    - someone else's: history.publicProfile({ username }) — public,
 *      looks up the user via Clerk username. MT auto-sync skipped. */
export function ProfileView({ username }: { username?: string }) {
  const backend = useBackend();
  const { user, isLoaded: userLoaded } = useUser();
  const isOwner = userLoaded ? matchesViewer(username, user) : null;

  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for Clerk to load so the owner / visitor branch is stable.
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
  // Two MT slices participate here:
  //   1. `subjectMtSlice` — comes from the snapshot. This is the
  //      *subject's* MT overlay (the user the URL points at). The
  //      server strips the encrypted Ape Key before returning it so
  //      the visitor only ever sees public counters + PBs. This is
  //      what drives the rendered level / PBs / lifetime totals so
  //      visitors see the same numbers as the owner.
  //   2. `mtSliceRaw` — the *viewer's* own stored slice from
  //      user_prefs (via useRemotePrefs). Only used for the manage
  //      dialog and auto-sync, never as merge input. Visitors looking
  //      at someone else's profile must never see *their* MT PBs leak
  //      into the visited profile, so this is gated on `isOwner` for
  //      every UI surface that consumes it.
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

  if (error) {
    return (
      <>
        <ProfileHero
          totals={totals}
          username={username}
          isOwner={heroIsOwner}
          tags={subjectTags}
        />
        <section className="px-5 py-12 sm:px-12 sm:py-14 lg:px-16">
          <p className="text-sm text-primary">{error}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <ProfileHero
        totals={totals}
        username={username}
        isOwner={heroIsOwner}
        tags={subjectTags}
      />
      <ProfileStats totals={totals} streak={streak} rank={null} />
      <PersonalBests bests={bests} />
      <ActivityHeatmap days={activity} streak={streak} />
      <WpmTrend points={trend} />
      <RecentRuns tests={tests} />
      {loading ? (
        <p className="px-5 pb-10 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-12 lg:px-16">
          Loading the rest of {heroIsOwner ? "your" : "their"} history…
        </p>
      ) : null}
    </>
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
  // No username in the URL means /profile bare → always owner
  // (the page should have redirected, but treat it as own as a
  // safety net).
  if (!urlUsername) return true;
  const candidates = new Set<string>();
  if (user.username) candidates.add(user.username);
  const email = user.emailAddresses?.[0]?.emailAddress.split("@")[0];
  if (email) candidates.add(email);
  if (user.id) candidates.add(user.id);
  return candidates.has(urlUsername);
}
