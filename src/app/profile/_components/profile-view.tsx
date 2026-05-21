"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import type { FriendRelationship, FriendStats } from "@/types/friends";
import type { HistorySummaryOutput } from "@/types/history";
import type { RankId } from "@/types/rank";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";
import { ActivityHeatmap } from "./activity-heatmap";
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
import { SkillPanel } from "./skill-panel";
import { MonkeytypeBanner } from "./monkeytype-banner";
import { MonkeyTypeImportDialog } from "./monkeytype-import-dialog";
import { MonkeyTypeManageDialog } from "./monkeytype-manage-dialog";
import { PersonalBests } from "./personal-bests";
import { ProfileHero } from "./profile-hero";
import { RecentRuns } from "./recent-runs";
import { WpmTrend } from "./wpm-trend";

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** /profile/<username> orchestrator. Wide MonkeyType-style layout —
 *  one card panel per section, stacked vertically with a tight gap.
 *
 *  Owns the MonkeyType import + manage dialog state so both the hero
 *  kebab menu AND the dismissible MonkeyType banner can open them
 *  through the same callbacks. */
export function ProfileView({ username }: { username?: string }) {
  const backend = useBackend();
  const { user, isLoaded: userLoaded } = useUser();
  const isOwner = userLoaded ? matchesViewer(username, user) : null;

  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [relationship, setRelationship] = useState<FriendRelationship | null>(
    null,
  );

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

  const tests = snapshot?.recentTests ?? [];
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
  const activity = useMemo(() => deriveActivity(tests, 52), [tests]);
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-6 sm:gap-4 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
      <MonkeytypeBanner
        isOwner={heroIsOwner}
        isConnected={isMtConnected}
        onConnect={() => setImportOpen(true)}
      />
      <ProfileHero
        username={username}
        isOwner={heroIsOwner}
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

      {error ? (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-primary">
          {error}
        </div>
      ) : (
        <>
          <SkillPanel skills={skills} enoughData={totals.testsCompleted > 0} />
          <PersonalBests bests={bests} />
          <ActivityHeatmap days={activity} streak={streak} />
          <WpmTrend points={trend} />
          <RecentRuns tests={tests} handle={username ?? "racer"} />
        </>
      )}

      {loading && !error ? (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Loading the rest of {heroIsOwner ? "your" : "their"} history…
        </p>
      ) : null}

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
    </main>
  );
}

function matchesViewer(
  urlUsername: string | undefined,
  user: ReturnType<typeof useUser>["user"],
): boolean {
  if (!user) return false;
  if (!urlUsername) return true;
  // Case-insensitive compare — Clerk preserves casing on usernames
  // but the auto-derived names from ensureUsername are lowercased,
  // so the same user could be reachable via either form depending
  // on which path generated the URL.
  const target = urlUsername.toLowerCase();
  const candidates = new Set<string>();
  if (user.username) candidates.add(user.username.toLowerCase());
  if (user.id) {
    candidates.add(user.id.toLowerCase());
    // Auto-derived fallback shape from ensureUsername when neither
    // an email nor a name is usable: `u_<first-12-of-userId>`.
    const tail = user.id.replace(/^user_/, "").slice(0, 12).toLowerCase();
    candidates.add(`u_${tail}`);
  }
  const email = user.emailAddresses?.[0]?.emailAddress;
  if (email) {
    const local = email.split("@")[0]?.toLowerCase();
    if (local) {
      candidates.add(local);
      // Sanitised form matching auto-username's derivation (dots /
      // plus / non-word chars → underscore, trim leading/trailing).
      candidates.add(
        local.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, ""),
      );
    }
  }
  return candidates.has(target);
}
