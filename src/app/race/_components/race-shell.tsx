"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useBackend } from "@/lib/backend";
import { InputCapture } from "../../_components/input-capture";
import { PracticeProvider } from "../../_components/practice-state";
import { clearHostStorage } from "../c/[slug]/_components/challenge-shell";
import type { RaceModeId } from "./race-data";
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
  const [modeId, setModeId] = useState<RaceModeId>(initialModeId ?? "1v3");
  const [online, setOnline] = useState<RaceShellOnline | null>(
    initialOnline ?? null,
  );
  // Words come from the server when the user enters a room (matchmaking
  // or challenge). Until then, PracticeProvider mounts empty.
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

  // Confirm-before-leave is on whenever the user is connected to a
  // server room (matching → lobby → countdown → racing). Spectators
  // skip the guard — they're already read-only and have no progress
  // to lose. The actual prompt lives in `<LeaveGuard>` further down,
  // mounted inside the race provider so it can read `phase` and
  // silently bypass once the race has finished.
  const isSpectating = online?.spectate === true;
  const leaveGuardActive = online != null && !isSpectating;

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
  const words = online?.words ?? [];
  // Subtree key — bumps when the room handle changes (or on mode
  // switch). Both PracticeProvider and the race provider re-mount
  // together so racing state never lags the practice state.
  const subtreeKey = `${modeId}:${online?.roomId ?? "queue"}:${youName}`;

  const initialRoomForProvider = online
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
      onlineEnterQueue={enterQueue}
      onlineAbandon={abandon}
      onlineRoomCancelled={onRoomCancelled}
      initialOnlineRoom={initialRoomForProvider}
      challengeSlug={challengeSlug ?? null}
    >
      {/* LeaveGuard reads race phase to silence the prompt once the
       *  race has finished, so the results screen feels lightweight. */}
      <LeaveGuard active={leaveGuardActive} />
      {children}
    </RaceProvider>
  );

  // raceMode tags the submitTest row as mode="race" so the user's
  // history can distinguish race runs from regular practice.
  const raceMode = online != null;

  // Spectators are read-only — never wrap the surface in
  // InputCapture (we'd capture their typing into a hidden input that
  // dispatches into PracticeProvider, even though they have no role
  // in the race). Mounting raceTree directly preserves the visible
  // surface (snapshots stream as normal) while dropping the
  // keystroke pipeline. A persistent banner at the top makes the
  // read-only context unmistakable.
  return (
    <PracticeProvider key={subtreeKey} lockedWords={words} raceMode={raceMode}>
      {isSpectating ? <SpectatorBanner /> : null}
      {isSpectating ? raceTree : <InputCapture>{raceTree}</InputCapture>}
    </PracticeProvider>
  );
}

/** Persistent banner at the top of the race surface declaring the
 *  user is in spectate mode. Sits above the race tree so it never
 *  competes with the race surface that's mounted
 *  underneath. Hairline border + muted-foreground type keep it calm
 *  — spectator mode is *information*, not an alert. */
function SpectatorBanner() {
  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-card/40 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
      <span>
        Spectating · this lobby is full or already started
      </span>
    </div>
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
