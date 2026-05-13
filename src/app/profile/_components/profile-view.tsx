"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const isMtConnected = hasStoredKey;

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
  const subjectEligibleTags = snapshot?.eligibleTags ?? [];

  const onTagsChanged = useCallback((next: typeof subjectTags) => {
    setSnapshot((prev) => (prev ? { ...prev, tags: next } : prev));
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
        totals={totals}
        streak={streak}
        isMtConnected={isMtConnected}
        onOpenMt={heroIsOwner ? onOpenMt : undefined}
        subjectAvatarUrl={snapshot?.subjectAvatarUrl ?? null}
      />

      {error ? (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-primary">
          {error}
        </div>
      ) : (
        <>
          <PersonalBests bests={bests} />
          <ActivityHeatmap days={activity} streak={streak} />
          <WpmTrend points={trend} />
          <RecentRuns tests={tests} />
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
  const candidates = new Set<string>();
  if (user.username) candidates.add(user.username);
  const email = user.emailAddresses?.[0]?.emailAddress.split("@")[0];
  if (email) candidates.add(email);
  if (user.id) candidates.add(user.id);
  return candidates.has(urlUsername);
}
