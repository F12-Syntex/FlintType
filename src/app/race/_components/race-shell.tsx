"use client";

import { useUser } from "@clerk/nextjs";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useBackend } from "@/lib/backend";
import { InputCapture } from "../../_components/input-capture";
import { PracticeProvider } from "../../_components/practice-state";
import { RACE_MODES, type RaceModeId } from "./race-data";
import { RaceProvider } from "./race-state";
import { LeaveGuard } from "./leave-guard";

/** Pull a short, race-feed-friendly handle from the Clerk session.
 *  Mirrors the `firstName ?? username ?? email-localpart ?? "you"`
 *  fallback chain used in the topbar. Always prefixed with `@`. */
function useYouHandle(): string {
  const { user, isSignedIn } = useUser();
  if (!isSignedIn || !user) return "@you";
  const raw =
    user.firstName ??
    user.username ??
    user.emailAddresses[0]?.emailAddress.split("@")[0] ??
    "you";
  return raw.startsWith("@") ? raw : `@${raw}`;
}

export type RaceShellOnline = {
  roomId: string;
  sessionToken: string;
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
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
 *  Routes branch:
 *    - burst mode → offline reducer (still local, see race-state.tsx)
 *    - everything else → online provider (server-driven via SSE) */
export function RaceShell({
  children,
  initialOnline,
  initialModeId,
}: {
  children: ReactNode;
  /** Pre-joined online room — used by /race/c/[slug] which hits
   *  challenge.join on the server *before* the shell mounts. */
  initialOnline?: RaceShellOnline | null;
  initialModeId?: RaceModeId;
}) {
  const backend = useBackend();
  const [modeId, setModeId] = useState<RaceModeId>(initialModeId ?? "1v3");
  const [online, setOnline] = useState<RaceShellOnline | null>(
    initialOnline ?? null,
  );
  // Burst stays offline; the shell still mounts PracticeProvider for
  // it but with an empty word list (the burst surface owns its own
  // typing). For passage modes, words come from the server when the
  // user enters a room.
  const mode = RACE_MODES[modeId];
  const isBurst = mode.kind === "burst";

  const enterQueue = useCallback(async () => {
    try {
      const res = await backend.race.queue({ modeId });
      setOnline({
        roomId: res.roomId,
        sessionToken: res.sessionToken,
        words: res.words,
        totalChars: res.totalChars,
        modeId: res.modeId as RaceModeId,
      });
    } catch {
      // Keep the user on the queue surface; race-controls will let
      // them retry. No throw — backend hiccup shouldn't crash the UI.
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
    },
    [backend, online],
  );

  // Confirm-before-leave is on whenever the user is connected to a
  // server room (matching → lobby → countdown → racing). Burst mode
  // runs offline so the guard stays off for it. The actual prompt
  // lives in `<LeaveGuard>` further down — mounted inside the race
  // provider so it can read `phase` and silently bypass once the
  // race has finished (no "are you sure?" on the results screen).
  const leaveGuardActive = online != null;

  // Tab is hard-blocked while the race shell is mounted. Practice's
  // own keydown handler binds Tab to RESTART the test; on the race
  // surface that would wipe the user's typed progress mid-race or
  // bounce them back to word zero on the queue surface. Capture-phase
  // listener so we win the race against InputCapture's bubble-phase
  // handler.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  const youName = useYouHandle();
  const words = isBurst ? ([] as readonly string[]) : online?.words ?? [];
  // Subtree key — bumps when the room handle changes (or on mode
  // switch). Both PracticeProvider and the race provider re-mount
  // together so racing state never lags the practice state.
  const subtreeKey = `${modeId}:${online?.roomId ?? "queue"}:${youName}`;

  // For burst mode, fall back to the legacy seed-based provider path:
  // it manages its own queue → matching → lobby state locally.
  const initialRoomForProvider =
    !isBurst && online
      ? { roomId: online.roomId, sessionToken: online.sessionToken }
      : null;

  const raceTree = (
    <RaceProvider
      key={subtreeKey}
      modeId={modeId}
      raceSeed={(online?.roomId ? hashSeed(online.roomId) : Date.now()) | 0}
      withQueue={!online}
      youName={youName}
      setModeId={switchMode}
      restartShell={restart}
      enterQueueShell={enterQueue}
      onlineEnterQueue={isBurst ? undefined : enterQueue}
      onlineAbandon={isBurst ? undefined : abandon}
      initialOnlineRoom={initialRoomForProvider}
    >
      {/* LeaveGuard reads race phase to silence the prompt once the
       *  race has finished, so the results screen feels lightweight. */}
      <LeaveGuard active={leaveGuardActive} />
      {children}
    </RaceProvider>
  );

  // raceMode tags the submitTest row as mode="race" so the user's
  // history can distinguish race runs from regular practice. Only
  // online passage races feed PracticeProvider with a real word
  // list — burst handles its own typing surface and saves separately.
  const raceMode = !isBurst && online != null;

  return (
    <PracticeProvider key={subtreeKey} lockedWords={words} raceMode={raceMode}>
      {isBurst ? raceTree : <InputCapture>{raceTree}</InputCapture>}
    </PracticeProvider>
  );
}

/** Stable 32-bit seed derived from a room id. Used so client-side
 *  features that key off `state.raceSeed` (e.g. the offline bots'
 *  jitter, which the online flow doesn't run anyway) still see a
 *  consistent value per room rather than a constantly-rotating
 *  Date.now(). */
function hashSeed(roomId: string): number {
  let h = 5381;
  for (let i = 0; i < roomId.length; i += 1) {
    h = ((h << 5) + h + roomId.charCodeAt(i)) >>> 0;
  }
  return h;
}
