"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import type { RankId } from "@/types/rank";
import type { UserTagId } from "@/types/user-tag";
import { ActivitySkillCard } from "./activity-skill-card";
import { deriveActivity, deriveStreak } from "./derive-activity";
import {
  derivePersonalBests,
  deriveSkills,
  deriveTotals,
  deriveTrend,
} from "./derive-stats";
import { matchesViewer } from "./matches-viewer";
import { MonkeytypeBanner } from "./monkeytype-banner";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";
import { MonkeyTypeManageDialog } from "./monkeytype-manage-dialog";
import { mergePersonalBestsWithMt, mergeTotalsWithMt } from "./mt-merge";
import { PersonalBests } from "./personal-bests";
import { ProfileHero } from "./profile-hero";
import { type ProfileLoadError, toProfileLoadError } from "./profile-load-error";
import {
  ProfileErrorState,
  ProfileNotFound,
  ProfileSkeleton,
} from "./profile-states";
import { RecentRuns } from "./recent-runs";
import { useMonkeytypeSync } from "./use-monkeytype-sync";
import { useProfileFriends } from "./use-profile-friends";
import { WpmTrend } from "./wpm-trend";

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
        if (!cancelled) setError(toProfileLoadError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [backend, isOwner, username, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const subjectUserId = snapshot?.subjectUserId ?? null;
  const { friendStats, relationship, onRelationshipChange } =
    useProfileFriends({
      backend,
      subjectUserId,
      isOwner,
      signedIn: user != null,
    });
  const mt = useMonkeytypeSync(backend, isOwner);

  const tests = useMemo(() => snapshot?.recentTests ?? [], [snapshot]);
  const subjectMtSlice = snapshot?.monkeytype ?? null;
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
  // 6 months (26 weeks): the heatmap shares the split card's narrower
  // column, so fewer columns keep the cells a readable size.
  const activity = useMemo(() => deriveActivity(tests, 26), [tests]);
  // Every completed run: the chart filters by range, then downsamples.
  const trend = useMemo(() => deriveTrend(tests), [tests]);
  const skills = useMemo(() => deriveSkills(tests, totals), [tests, totals]);

  const heroIsOwner = isOwner === true;

  const onTagsChanged = useCallback((next: UserTagId[]) => {
    setSnapshot((prev) => (prev ? { ...prev, tags: next } : prev));
  }, []);

  const onRankChanged = useCallback((next: RankId | null) => {
    setSnapshot((prev) => (prev ? { ...prev, rank: next } : prev));
  }, []);

  // The kebab menu and the banner share this: Manage when connected,
  // Import otherwise.
  const onOpenMt = useCallback(() => {
    if (mt.isMtConnected) setManageOpen(true);
    else setImportOpen(true);
  }, [mt.isMtConnected]);

  if (error?.kind === "notFound") {
    return (
      <PageShell>
        <ProfileNotFound username={username} />
      </PageShell>
    );
  }

  // A visitor whose load failed has no real identity to show: render
  // the error alone (carrying the h1), not a hero invented from the URL.
  if (error && isOwner === false) {
    return (
      <PageShell>
        <ProfileErrorState error={error} onRetry={retry} asPage />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-3">
        <ProfileHero
          username={username}
          isOwner={heroIsOwner}
          identityPending={
            isOwner == null || (isOwner === false && snapshot == null)
          }
          pending={snapshot == null}
          tags={snapshot?.tags ?? []}
          eligibleTags={snapshot?.eligibleTags ?? []}
          onTagsChanged={heroIsOwner ? onTagsChanged : undefined}
          rank={snapshot?.rank ?? null}
          onRankChanged={heroIsOwner ? onRankChanged : undefined}
          totals={totals}
          streak={streak}
          isMtConnected={mt.isMtConnected}
          onOpenMt={heroIsOwner ? onOpenMt : undefined}
          subjectAvatarUrl={snapshot?.subjectAvatarUrl ?? null}
          subjectUserId={subjectUserId}
          friendStats={friendStats}
          relationship={relationship}
          onRelationshipChange={onRelationshipChange}
        />
        <MonkeytypeBanner
          isOwner={heroIsOwner}
          isConnected={mt.isMtConnected}
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
            bests={bests}
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
          {mt.isMtConnected ? (
            <MonkeyTypeManageDialog
              open={manageOpen}
              onOpenChange={setManageOpen}
              slice={mt.slice}
              onSliceUpdate={mt.update}
              onSliceCleared={mt.clear}
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
