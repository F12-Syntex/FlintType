"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBackend } from "@/lib/backend";
import { AutoHideApplier } from "../../_components/autohide-applier";
import { InputCapture } from "../../_components/input-capture";
import { PracticeProvider } from "../../_components/practice-state";
import { ReportActivity } from "../../_components/report-activity";
import { clearHostStorage } from "../c/[slug]/_components/challenge-shell";
import { hashSeed, type RaceModeId } from "./race-data";
import { RaceProvider } from "./race-state";
import { LeaveGuard } from "./leave-guard";
import {
  IDLE_QUEUE_STATUS,
  QueueStatusContext,
  type QueueStatus,
} from "./queue-status";
import { raceErrorMessage } from "./race-errors";
import { SpectatorBanner } from "./spectator-banner";
import { useLeaveOnUnmount } from "./use-leave-on-unmount";
import { TabFocusGuard } from "./tab-focus-guard";
import { useYouHandle } from "./use-you-handle";

export type RaceShellOnline = {
  roomId: string;
  sessionToken: string;
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
  /** 1-indexed round counter — included in the subtree key so a
   *  rematch (round bump) triggers a clean re-mount of PracticeProvider
   *  and the race provider with the new passage. Starts at 1 the
   *  moment the room is first joined; the shell bumps it via
   *  `onlineRoundAdvance` when the server starts a new round. */
  roundNumber: number;
  /** True when the user joined a full/started challenge as a
   *  spectator. The shell drops InputCapture entirely (no typing),
   *  the leave-guard sleeps, and a banner replaces the action
   *  cluster. Snapshots still stream so the spectator sees the race
   *  unfold live. */
  spectate?: boolean;
};

/** Race shell. Owns:
 *
 *    - modeId for the current race mode
 *    - online room handle (after the user enters matchmaking / a
 *      challenge), which carries the passage words for PracticeProvider
 *    - the subtree key — bumped on every room join / mode switch so
 *      both PracticeProvider's lockedWords and the race provider's
 *      internal state reset in lockstep
 *
 *  Every race mode is online (server-driven via SSE). */
export function RaceShell({
  children,
  initialOnline,
  initialModeId,
  challengeSlug,
}: {
  children: ReactNode;
  /** Pre-joined online room — used by /race/c/[slug] which hits
   *  challenge.join on the server *before* the shell mounts. */
  initialOnline?: RaceShellOnline | null;
  initialModeId?: RaceModeId;
  /** The slug of the challenge room (only set when this shell was
   *  mounted from `/race/c/<slug>`). Threaded into RaceCtx so the
   *  lobby UI can render the share-link. */
  challengeSlug?: string;
}) {
  const backend = useBackend();
  const router = useRouter();
  const [modeId, setModeId] = useState<RaceModeId>(initialModeId ?? "1v1");
  const [online, setOnline] = useState<RaceShellOnline | null>(
    initialOnline ?? null,
  );
  // "Find race" request status, published to the launcher via
  // QueueStatusContext (pending button label + visible error line).
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(IDLE_QUEUE_STATUS);
  const queuePendingRef = useRef(false);
  // Words come from the server when the user enters a room (matchmaking
  // or challenge). Until then, PracticeProvider mounts empty.
  const enterQueue = useCallback(async () => {
    // One request at a time — a double-click must not open two seats.
    if (queuePendingRef.current) return;
    queuePendingRef.current = true;
    setQueueStatus({ pending: true, error: null });
    try {
      const res = await backend.race.queue({ modeId });
      setOnline({
        roomId: res.roomId,
        sessionToken: res.sessionToken,
        words: res.words,
        totalChars: res.totalChars,
        modeId: res.modeId as RaceModeId,
        roundNumber: 1,
      });
      setQueueStatus(IDLE_QUEUE_STATUS);
    } catch (err) {
      // Keep the user on the launcher and say why; they can retry.
      setQueueStatus({
        pending: false,
        error: raceErrorMessage(
          err,
          "Couldn't find a race right now. Check your connection and try again.",
        ),
      });
    } finally {
      queuePendingRef.current = false;
    }
  }, [backend, modeId]);

  const abandon = useCallback(() => {
    if (online) {
      void backend.race.leave({
        roomId: online.roomId,
        sessionToken: online.sessionToken,
      });
      setOnline(null);
    }
  }, [backend, online]);

  const restart = useCallback(() => {
    if (online) {
      void backend.race.leave({
        roomId: online.roomId,
        sessionToken: online.sessionToken,
      });
      setOnline(null);
    }
    // Defer the re-queue to the next tick so the leave POST fires
    // first; not strictly required (the route accepts overlapping
    // calls) but it keeps the server log honest.
    void Promise.resolve().then(enterQueue);
  }, [backend, online, enterQueue]);

  const switchMode = useCallback(
    (next: RaceModeId) => {
      if (online) {
        void backend.race.leave({
          roomId: online.roomId,
          sessionToken: online.sessionToken,
        });
        setOnline(null);
      }
      setModeId(next);
      setQueueStatus(IDLE_QUEUE_STATUS);
    },
    [backend, online],
  );

  // Host cancelled this challenge (or a guest's room was cancelled by
  // the host) — wipe the slug-side session cache and bounce back to
  // /race so the URL is no longer pointing at a dead room. We always
  // clear the slug regardless of who triggered it; the host's storage
  // key is keyed by slug and stays inert for guests.
  const onRoomCancelled = useCallback(() => {
    if (challengeSlug) clearHostStorage(challengeSlug);
    setOnline(null);
    router.push("/race");
  }, [challengeSlug, router]);

  // Rematch fired server-side — the room bumped its roundNumber and
  // re-rolled the passage. Update our stored words + totalChars +
  // roundNumber so the subtree key changes (see below), which
  // re-mounts PracticeProvider with the fresh passage and the race
  // provider with a clean state machine. The SSE subscription
  // briefly reconnects across the re-mount; the room's next snapshot
  // immediately puts the client back into lobby/countdown for the
  // new round.
  const onRoundAdvance = useCallback(
    (next: {
      words: readonly string[];
      totalChars: number;
      roundNumber: number;
    }) => {
      setOnline((prev) =>
        prev
          ? {
              ...prev,
              words: next.words,
              totalChars: next.totalChars,
              roundNumber: next.roundNumber,
            }
          : prev,
      );
    },
    [],
  );

  // Confirm-before-leave is on whenever the user is connected to a
  // server room (matching → lobby → countdown → racing). Spectators
  // skip the guard — they're already read-only and have no progress
  // to lose. The actual prompt lives in `<LeaveGuard>` further down,
  // mounted inside the race provider so it can read `phase` and
  // silently bypass once the race has finished.
  const isSpectating = online?.spectate === true;
  const leaveGuardActive = online != null && !isSpectating;

  // Leave the room on a soft client-side navigation away (see hook).
  useLeaveOnUnmount(online);

  const youName = useYouHandle();
  const words = online?.words ?? [];
  // Subtree key — bumps when the room handle changes, the mode
  // switches, OR the room starts a new round (rematch). Including
  // roundNumber forces PracticeProvider and the race provider to
  // re-mount together with the fresh passage so racing state never
  // lags the practice state.
  const subtreeKey = `${modeId}:${online?.roomId ?? "queue"}:r${online?.roundNumber ?? 1}:${youName}`;

  // Published to the body with the queue status: true while the shell
  // is reconnecting to the SAME room for a rematch round (the subtree
  // re-mounts and briefly has no snapshot), so the body shows a quiet
  // "Starting the next round…" line instead of flashing the launcher.
  const rematching = (online?.roundNumber ?? 1) > 1;
  const queueContext = useMemo<QueueStatus>(
    () => ({ ...queueStatus, rematching }),
    [queueStatus, rematching],
  );

  const initialRoomForProvider = online
    ? { roomId: online.roomId, sessionToken: online.sessionToken }
    : null;

  const raceTree = (
    <RaceProvider
      key={subtreeKey}
      modeId={modeId}
      raceSeed={online?.roomId ? hashSeed(online.roomId) | 0 : 0}
      withQueue={!online}
      youName={youName}
      setModeId={switchMode}
      restartShell={restart}
      enterQueueShell={enterQueue}
      onlineEnterQueue={enterQueue}
      onlineAbandon={abandon}
      onlineRoomCancelled={onRoomCancelled}
      onlineRoundAdvance={onRoundAdvance}
      initialOnlineRoom={initialRoomForProvider}
      challengeSlug={challengeSlug ?? null}
    >
      {/* LeaveGuard reads race phase to silence the prompt once the
       *  race has finished, so the results screen feels lightweight. */}
      <LeaveGuard active={leaveGuardActive} />
      {/* Keeps Tab focus pinned to the typing input mid-run, but frees
       *  Tab in the lobby / results for keyboard-only navigation. */}
      <TabFocusGuard />
      {children}
    </RaceProvider>
  );

  // The provider ALWAYS runs in race mode on race pages, even on the
  // idle launcher before a room exists: race mode tags the submitted
  // row as mode="race", hands Tab to <TabFocusGuard> (which leaves Tab
  // alone outside the countdown / race, so keyboard users can reach the
  // launcher's controls instead of Tab being swallowed as a practice
  // "restart"), and keeps the solo live-practice broadcast off.
  // Nothing is ever submitted from the queue phase.

  // Spectators are read-only — never wrap the surface in
  // InputCapture (we'd capture their typing into a hidden input that
  // dispatches into PracticeProvider, even though they have no role
  // in the race). Mounting raceTree directly preserves the visible
  // surface (snapshots stream as normal) while dropping the
  // keystroke pipeline. A persistent banner at the top makes the
  // read-only context unmistakable.
  return (
    <QueueStatusContext.Provider value={queueContext}>
      <PracticeProvider key={subtreeKey} lockedWords={words} raceMode>
        <AutoHideApplier />
        {/* Only "racing" once there's a room; idling on the launcher is
         *  not racing, and spectators never report activity. */}
        {online != null && !isSpectating ? <ReportActivity status="racing" /> : null}
        {isSpectating ? <SpectatorBanner /> : null}
        {isSpectating ? raceTree : <InputCapture>{raceTree}</InputCapture>}
      </PracticeProvider>
    </QueueStatusContext.Provider>
  );
}
