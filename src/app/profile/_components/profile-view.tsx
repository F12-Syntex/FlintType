"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { BackendError, useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import type { FriendRelationship, FriendStats } from "@/types/friends";
import type { HistorySummaryOutput } from "@/types/history";
import type { RankId } from "@/types/rank";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";
import { ActivitySkillCard } from "./activity-skill-card";
import {
  deriveActivity,
  derivePersonalBests,
  deriveSkills,
  deriveStreak,
  deriveTotals,
  deriveTrend,
  mergePersonalBestsWithMt,
  mergeTotalsWithMt,
} from "./derive-stats";
import { matchesViewer } from "./matches-viewer";
import { MonkeytypeBanner } from "./monkeytype-banner";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";
import { MonkeyTypeManageDialog } from "./monkeytype-manage-dialog";
import { PersonalBests } from "./personal-bests";
import { ProfileHero } from "./profile-hero";
import {
  type ProfileLoadError,
  ProfileErrorState,
  ProfileNotFound,
  ProfileSkeleton,
} from "./profile-states";
import { RecentRuns } from "./recent-runs";
import { WpmTrend } from "./wpm-trend";

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** /profile/<username> orchestrator. One PageShell column: the hero
 *  card (the page's header), then Personal bests → Activity and skill →
 *  WPM trend → Recent runs as plain sections (ui-law §18).
 *
 *  Owns the MonkeyType import + manage dialog state so both the hero
 *  ⋯ menu AND the dismissible MonkeyType banner can open them through
 *  the same callbacks. */
export function ProfileView({ username }: { username?: string }) {
  const backend = useBackend();
  const { user, isLoaded: userLoaded } = useUser();
  const isOwner = userLoaded ? matchesViewer(username, user) : null;

  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<ProfileLoadError | null>(null);
  // Bumped by "Try again" to re-run the snapshot fetch.
  const [attempt, setAttempt] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [relationship, setRelationship] = useState<FriendRelationship | null>(
    null,
  );

  useEffect(() => {
    if (isOwner == null) return;
    let cancelled = false;
    const fetcher = isOwner
      ? backend.history.summary()
      : backend.history.publicProfile({ username: username! });
    fetcher
      .then((r) => {
        if (cancelled) return;
        setError(null);
        setSnapshot(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError({ kind: "signIn", message: "Sign in to view your profile." });
        } else if (err instanceof BackendError && err.code === "NOT_FOUND") {
          setError({
            kind: "notFound",
            message: `There's no flinttype profile for @${username}.`,
          });
        } else if (err instanceof BackendError && err.code === "RATE_LIMITED") {
          setError({
            kind: "other",
            message: "Too many requests. Wait a moment, then try again.",
            detail: err.code,
          });
        } else {
          setError({
            kind: "other",
            message: "Couldn't load this profile.",
            detail:
              err instanceof BackendError
                ? `${err.code}: ${err.message}`
                : err instanceof Error
                  ? err.message
                  : undefined,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [backend, isOwner, username, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  // Friend data — counts for everyone, relationship only for visitors.
  // The friends routes require auth, so anonymous viewers get neither
  // (they see the profile without follow chrome).
  const subjectUserId = snapshot?.subjectUserId ?? null;
  useEffect(() => {
    if (!subjectUserId || !user) {
      setFriendStats(null);
      setRelationship(null);
      return;
    }
    let cancelled = false;
    backend.friends
      .stats({ userId: subjectUserId })
      .then((s) => {
        if (!cancelled) setFriendStats(s);
      })
      .catch(() => {});
    if (isOwner === false) {
      backend.friends
        .relationship({ userId: subjectUserId })
        .then((r) => {
          if (!cancelled) setRelationship(r);
        })
        .catch(() => {});
    } else {
      setRelationship(null);
    }
    return () => {
      cancelled = true;
    };
  }, [backend, subjectUserId, isOwner, user]);

  const tests = useMemo(() => snapshot?.recentTests ?? [], [snapshot]);
  const subjectMtSlice = snapshot?.monkeytype ?? null;
  const { value: mtSliceRaw, update: updateMtSlice } =
    useRemotePrefs<MonkeytypeStatsSlice>("monkeytypeStats", EMPTY_MT_SLICE);
  const ownMtSlice = mtSliceRaw.importedAt > 0 ? mtSliceRaw : null;
  const hasStoredKey = isOwner === true && ownMtSlice?.encryptedApiKey != null;
  // The MonkeyType banner hides once the owner has imported their
  // data — by either path: storing an Ape Key for repeated re-sync
  // OR doing a one-shot data import (which writes importedAt > 0
  // but no encryptedApiKey). The previous "connected = key stored"
  // rule let the banner stick around forever for users who imported
  // their MT export without handing over a key. Auto-sync still
  // gates on `hasStoredKey` below — only the banner relaxes.
  const isMtConnected = ownMtSlice != null;

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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasStoredKey, backend, updateMtSlice]);

  const localTotals = useMemo(
    () => deriveTotals(tests, snapshot?.lifetimeStats),
    [tests, snapshot?.lifetimeStats],
  );
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
  // 6 months (26 weeks), not 12 — the heatmap shares the split card's
  // narrower column now, so fewer columns keep the cells their old size.
  const activity = useMemo(() => deriveActivity(tests, 26), [tests]);
  const trend = useMemo(() => deriveTrend(tests, 60), [tests]);
  const skills = useMemo(() => deriveSkills(tests, totals), [tests, totals]);

  const heroIsOwner = isOwner === true;
  const subjectTags = snapshot?.tags ?? [];
  const subjectEligibleTags = snapshot?.eligibleTags ?? [];

  const onTagsChanged = useCallback((next: typeof subjectTags) => {
    setSnapshot((prev) => (prev ? { ...prev, tags: next } : prev));
  }, []);

  const onRankChanged = useCallback((next: RankId | null) => {
    setSnapshot((prev) => (prev ? { ...prev, rank: next } : prev));
  }, []);

  // MT dialog open/manage routing — the kebab menu and the banner
  // share these. Open Manage when connected, Import otherwise.
  const onOpenMt = useCallback(() => {
    if (isMtConnected) setManageOpen(true);
    else setImportOpen(true);
  }, [isMtConnected]);

  if (error?.kind === "notFound") {
    return (
      <PageShell>
        <ProfileNotFound message={error.message} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-3">
        <ProfileHero
          username={username}
          isOwner={heroIsOwner}
          pending={snapshot == null}
          tags={subjectTags}
          eligibleTags={subjectEligibleTags}
          onTagsChanged={heroIsOwner ? onTagsChanged : undefined}
          rank={snapshot?.rank ?? null}
          onRankChanged={heroIsOwner ? onRankChanged : undefined}
          totals={totals}
          streak={streak}
          isMtConnected={isMtConnected}
          onOpenMt={heroIsOwner ? onOpenMt : undefined}
          subjectAvatarUrl={snapshot?.subjectAvatarUrl ?? null}
          subjectUserId={subjectUserId}
          friendStats={friendStats}
          relationship={relationship}
        />
        <MonkeytypeBanner
          isOwner={heroIsOwner}
          isConnected={isMtConnected}
          onConnect={() => setImportOpen(true)}
        />
      </div>

      {error ? (
        <ProfileErrorState error={error} onRetry={retry} />
      ) : snapshot == null ? (
        <ProfileSkeleton />
      ) : (
        <>
          <PersonalBests bests={bests} />
          <ActivitySkillCard
            days={activity}
            streak={streak}
            skills={skills}
            enoughSkill={totals.testsCompleted > 0}
          />
          <WpmTrend points={trend} />
          <RecentRuns
            tests={tests}
            handle={username ?? "racer"}
            isOwner={heroIsOwner}
          />
        </>
      )}

      {heroIsOwner ? (
        <>
          <MonkeyTypeImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
          />
          {isMtConnected ? (
            <MonkeyTypeManageDialog
              open={manageOpen}
              onOpenChange={setManageOpen}
              slice={mtSliceRaw}
              onSliceUpdate={(next) => updateMtSlice(next)}
              onSliceCleared={() => updateMtSlice(EMPTY_MT_SLICE)}
              onRepaste={() => {
                setManageOpen(false);
                setImportOpen(true);
              }}
            />
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
