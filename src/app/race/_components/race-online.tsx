"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBackend } from "@/lib/backend";
import {
  countdownDigit,
  elapsedSeconds,
  mergeOffset,
  offsetSample,
  serverNow,
} from "@/lib/race-clock";
import { isRaceInputLocked, setRaceInputLocked } from "@/lib/race-input";
import { calcWpmAndRaw } from "@/lib/wpm";
import { usePractice } from "../../_components/practice-state";
import type { RoomRacer, RoomSnapshot } from "@/types/race";
import { BOTS, type BotId } from "./race-data";
import { useRaceRoom } from "./use-race-room";
import { type RaceCtx, RaceContext } from "./race-context";
import type { Racer, RaceState } from "./race-types";
import type { RaceModeId } from "./race-data";

/** Online RaceProvider — server-authoritative race for the passage
 *  modes (1v1 / free-for-all). Holds the room handle
 *  state (roomId + sessionToken), subscribes to the room's SSE
 *  snapshot stream via `useRaceRoom`, and translates each snapshot
 *  into the existing client RaceState shape so the rest of the UI
 *  (lanes / sidebar / results / passage) keeps working unchanged.
 *
 *  User progress is computed locally from PracticeContext (instant
 *  feedback on each keystroke) and posted to the server through
 *  `sendProgress`, which the hook debounces to ~one POST per 120ms.
 *  The next snapshot includes the user's published progress, closing
 *  the loop. */
export function OnlineRaceProvider({
  modeId,
  raceSeed,
  youName,
  setModeId,
  restartShell,
  initialRoom,
  challengeSlug,
  onEnterQueue,
  onAbandon,
  onRoomCancelled,
  onRoundAdvance,
  children,
}: {
  modeId: RaceModeId;
  raceSeed: number;
  youName: string;
  setModeId: (next: RaceModeId) => void;
  restartShell: () => void;
  /** When provided, the provider skips the local "queue" UI and goes
   *  straight to subscribing to the named room. Used by challenge
   *  rooms whose handle is pre-created on the server before the
   *  provider mounts. */
  initialRoom?: { roomId: string; sessionToken: string } | null;
  /** Slug of the challenge room when the provider was mounted from
   *  `/race/c/<slug>`. Surfaced via RaceCtx for the share-link UI. */
  challengeSlug?: string | null;
  /** Shell-owned queue / abandon callbacks. The shell needs to be
   *  the one to fetch the room handle because it has to re-key the
   *  surrounding PracticeProvider with the new word list. */
  onEnterQueue?: () => void;
  onAbandon?: () => void;
  /** Fires when the server snapshot reports `cancelled: true` — host
   *  destroyed the lobby. Shell tears down the slug-side state and
   *  navigates back to /race. */
  onRoomCancelled?: () => void;
  /** Fires when the server snapshot's `roundNumber` increments —
   *  i.e. the room just transitioned out of "finished" into the next
   *  round via a rematch. The shell uses this to update its stored
   *  `online.words` and bump the subtree key so PracticeProvider
   *  re-mounts with the fresh passage. */
  onRoundAdvance?: (next: {
    words: readonly string[];
    totalChars: number;
    roundNumber: number;
  }) => void;
  children: ReactNode;
}) {
  const backend = useBackend();
  // The shell owns the room handle (it has to, because it controls
  // PracticeProvider's `lockedWords` and that prop must come from the
  // queue response). When `initialRoom` is set, we're connected; when
  // null, we're in the local queue state.
  const room = initialRoom ?? null;

  const {
    snapshot,
    state: roomState,
    sendProgress,
    leave,
    rematch: rematchRoom,
  } = useRaceRoom({
    roomId: room?.roomId ?? null,
    sessionToken: room?.sessionToken ?? null,
  });

  const youSnapshot = useYouLocalSnapshot(snapshot?.raceStartedAt ?? null);
  const youSessionToken = room?.sessionToken ?? null;

  // Push the local progress to the server as it changes during racing.
  // Outside racing we don't post (the server only accepts updates
  // while phase === "racing"). The hook itself debounces, so this
  // effect can fire on every practice-state change without flooding.
  useEffect(() => {
    if (snapshot?.phase !== "racing") return;
    sendProgress(
      youSnapshot.correctChars,
      youSnapshot.wpm,
      youSnapshot.finished,
      youSnapshot.errors,
      youSnapshot.accuracy,
    );
  }, [
    youSnapshot.correctChars,
    youSnapshot.wpm,
    youSnapshot.finished,
    youSnapshot.errors,
    youSnapshot.accuracy,
    snapshot?.phase,
    sendProgress,
  ]);

  // Lock keystroke input until the server flips the room to "racing".
  // Published to the shared store the keystroke handlers (the hidden
  // <InputCapture> input + the practice window keydown handler) read
  // synchronously before they dispatch. We set it during *render* (not
  // in an effect) so the lock is correct from the very first frame the
  // surface mounts — the exact moment a user can start spamming keys.
  // If we waited for an effect, the connecting window (snapshot still
  // null) would be briefly unlocked and a fast spammer could accumulate
  // local progress to dump at the gun. isRaceInputLocked(null) is true,
  // so the surface opens locked and only unlocks when the server says
  // "racing". The unmount cleanup releases it so a later single-player
  // run is never left locked.
  const youFinished =
    snapshot?.racers.find((r) => r.id === room?.sessionToken)?.finishedAt != null;
  setRaceInputLocked(isRaceInputLocked(snapshot?.phase, youFinished));
  useEffect(() => () => setRaceInputLocked(false), []);

  const state = useMemo(
    () =>
      snapshotToRaceState({
        snapshot,
        room,
        modeId,
        raceSeed,
        youName,
        youSnapshot,
      }),
    [snapshot, room, modeId, raceSeed, youName, youSnapshot],
  );

  const enterQueue = useCallback(() => {
    onEnterQueue?.();
  }, [onEnterQueue]);

  const abandon = useCallback(() => {
    leave();
    onAbandon?.();
  }, [leave, onAbandon]);

  const restart = useCallback(() => {
    leave();
    restartShell();
  }, [leave, restartShell]);

  const rematch = useCallback(
    (force = false) => {
      void rematchRoom(force);
    },
    [rematchRoom],
  );

  // Detect when the room transitions into a new round (rematch fired
  // server-side). The shell needs to hear this so it can update its
  // `online.words` snapshot and bump the subtree key — that re-mounts
  // PracticeProvider with the fresh passage. We fire the callback
  // only when the round number actually advances (not on every
  // snapshot) and only when words have arrived (the server emits
  // them once phase enters racing).
  const lastRoundRef = useRef<number>(1);
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.roundNumber <= lastRoundRef.current) return;
    if (!snapshot.words || snapshot.words.length === 0) return;
    lastRoundRef.current = snapshot.roundNumber;
    onRoundAdvance?.({
      words: snapshot.words,
      totalChars: snapshot.totalChars,
      roundNumber: snapshot.roundNumber,
    });
  }, [snapshot, onRoundAdvance]);

  // Find "you" in the snapshot so the UI can show host-only controls
  // (Cancel) without prop-drilling the host flag through every layer.
  const youRacer = useMemo(
    () => snapshot?.racers.find((r) => r.id === youSessionToken) ?? null,
    [snapshot, youSessionToken],
  );
  const isHost = youRacer?.isHost ?? false;

  const cancelLobby = useCallback(async () => {
    if (!room) return;
    try {
      await backend.race.challenge.cancel({
        roomId: room.roomId,
        sessionToken: room.sessionToken,
      });
    } catch {
      // The server route is host-gated and only succeeds in a
      // pre-finished phase; a 403 / 404 here means the cancel button
      // was clicked from a state where it shouldn't have been visible.
      // Swallow — there's no UI state to recover.
    }
  }, [backend, room]);

  // React to the host's cancel: the server emits a final snapshot
  // with `cancelled: true`. We hand control back to the shell so it
  // can wipe the slug-side state (sessionStorage, route) before the
  // user lands back on /race.
  const cancelledFiredRef = useRef(false);
  useEffect(() => {
    if (!snapshot?.cancelled) return;
    if (cancelledFiredRef.current) return;
    cancelledFiredRef.current = true;
    onRoomCancelled?.();
  }, [snapshot?.cancelled, onRoomCancelled]);

  // Dead / unreachable room. A missing room's SSE returns 404, which
  // the browser treats as a fatal close (no reconnect): the stream goes
  // `closed` and no snapshot ever arrives. The classic trigger is a HOST
  // returning to an expired challenge link — their cached sessionStorage
  // skips the join (which would 404 cleanly) and mounts the shell against
  // a room the server has long since GC'd, leaving them stuck on a blank
  // lobby forever. Treat "stream closed + never got a snapshot" as a
  // cancel so the shell wipes the stale cache and bounces to /race. The
  // grace window avoids firing during the brief initial connect, and the
  // `snapshot != null` guard means a normal end-of-race close never trips
  // it (a real race always delivered snapshots first).
  const deadFiredRef = useRef(false);
  useEffect(() => {
    if (!room) return;
    if (roomState !== "closed") return;
    if (snapshot != null) return;
    if (deadFiredRef.current) return;
    const t = setTimeout(() => {
      if (deadFiredRef.current) return;
      deadFiredRef.current = true;
      onRoomCancelled?.();
    }, 4_000);
    return () => clearTimeout(t);
  }, [room, roomState, snapshot, onRoomCancelled]);

  // Server-anchored clock. The snapshot's anchors
  // (countdownStartedAt / raceStartedAt) live on the SERVER's wall
  // clock, so comparing them against raw local Date.now() shifts the
  // countdown by the full device-clock skew — every client used to
  // start at a different moment. Instead we estimate
  // offset = serverClock − localClock from each snapshot's
  // serverNowMs stamp (mergeOffset keeps the lowest-latency sample)
  // and derive all timings from Date.now() + offset.
  const offsetRef = useRef<number | null>(null);
  const serverNowMs = snapshot?.serverNowMs ?? null;
  // Sample in a layout effect — never during render, where a discarded
  // concurrent render (or Strict Mode's double-invoke) would record a
  // sample non-deterministically. Layout effects run before regular
  // effects, so the rAF loop below always reads an anchored offset.
  useLayoutEffect(() => {
    if (serverNowMs == null) return;
    offsetRef.current = mergeOffset(
      offsetRef.current,
      offsetSample(serverNowMs, Date.now()),
    );
  }, [serverNowMs]);

  // Live timings during countdown / racing. The server snapshot only
  // re-broadcasts on state changes; during the 3-second countdown
  // nothing changes server-side, so the digit must tick locally. A
  // requestAnimationFrame loop recomputes the digit / elapsed second
  // from the anchored server clock and commits state only when a
  // rendered value actually flips — smooth, frame-accurate digit
  // changes with no 200ms quantisation stutter.
  const livePhase =
    snapshot?.phase === "countdown" || snapshot?.phase === "racing";
  const countdownStartedAt = snapshot?.countdownStartedAt ?? null;
  const raceStartedAt = snapshot?.raceStartedAt ?? null;
  const [liveTimings, setLiveTimings] = useState<{
    countdownNumber: number | null;
    elapsedSeconds: number;
  } | null>(null);
  useEffect(() => {
    if (!livePhase) {
      setLiveTimings(null);
      return;
    }
    let raf = 0;
    const loop = () => {
      const now = serverNow(offsetRef.current, Date.now());
      const next = {
        countdownNumber: countdownDigit(countdownStartedAt, now),
        elapsedSeconds: elapsedSeconds(raceStartedAt, now),
      };
      setLiveTimings((prev) =>
        prev != null &&
        prev.countdownNumber === next.countdownNumber &&
        prev.elapsedSeconds === next.elapsedSeconds
          ? prev
          : next,
      );
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [livePhase, countdownStartedAt, raceStartedAt]);

  const derived = useMemo(() => {
    if (!livePhase) return deriveTimings(state);
    if (liveTimings != null) return liveTimings;
    // First live frame: the rAF effect hasn't committed yet (liveTimings
    // is still null), so seed from the anchored clock right here instead
    // of falling through to deriveTimings' stale snapshot stamp. Pure
    // compute — fold the snapshot's own sample without writing the ref.
    const offset =
      serverNowMs != null
        ? mergeOffset(offsetRef.current, offsetSample(serverNowMs, Date.now()))
        : offsetRef.current;
    const now = serverNow(offset, Date.now());
    return {
      countdownNumber: countdownDigit(countdownStartedAt, now),
      elapsedSeconds: elapsedSeconds(raceStartedAt, now),
    };
  }, [
    livePhase,
    liveTimings,
    state,
    serverNowMs,
    countdownStartedAt,
    raceStartedAt,
  ]);

  const ctx = useMemo<RaceCtx>(
    () => ({
      state,
      modeId,
      setModeId,
      enterQueue,
      startCountdown: () => undefined, // server-driven; client can't force it
      restart,
      abandon,
      rematch,
      cancelLobby,
      isHost,
      ...derived,
      // Online-only conveniences read by the UI:
      onlineRoomId: room?.roomId ?? null,
      onlineSessionToken: youSessionToken,
      onlineSnapshot: snapshot,
      isChallenge: snapshot?.kind === "challenge",
      challengeSlug: challengeSlug ?? snapshot?.slug ?? null,
      rematchReady: snapshot?.rematchReady ?? [],
      roundNumber: snapshot?.roundNumber ?? 1,
    }),
    [
      state,
      modeId,
      setModeId,
      enterQueue,
      restart,
      abandon,
      rematch,
      cancelLobby,
      isHost,
      derived,
      room?.roomId,
      youSessionToken,
      snapshot,
      challengeSlug,
    ],
  );

  return <RaceContext.Provider value={ctx}>{children}</RaceContext.Provider>;
}

/* ─── Local progress derived from PracticeContext ─────────────── */

function useYouLocalSnapshot(raceStartedAt: number | null) {
  const { state } = usePractice();
  return useMemo(() => {
    // progressChars — cursor position in the passage, computed from
    // the *current* typed state (since the cursor moves with
    // backspaces). This is what the server uses for spectator views
    // and progress bars; it doesn't count corrected mistakes.
    let progressChars = 0;
    for (let i = 0; i < state.typed.length; i += 1) {
      const t = state.typed[i] ?? "";
      const w = state.words[i] ?? "";
      progressChars += Math.min(t.length, w.length);
      if (i < state.typed.length - 1) progressChars += 1;
    }
    // Strict accuracy + errors — derived from the reducer's running
    // counters, which increment on every keystroke and DO NOT
    // decrement on backspace. Making a mistake counts as a mistake
    // even if the user corrects it — the user's reasonable
    // expectation for a typing race, and what the race UI was missing
    // before (the old calc walked state.typed and only saw the
    // post-correction state, so a fix-up looked like 100% accuracy).
    const totalKeystrokes = state.totalChars;
    const correctKeystrokes = state.correctChars;
    const errors = Math.max(0, totalKeystrokes - correctKeystrokes);
    const accuracy =
      totalKeystrokes === 0
        ? 100
        : Math.round((correctKeystrokes / totalKeystrokes) * 1000) / 10;
    // Elapsed is anchored on the local `state.startTime` (the practice
    // reducer sets it on the first keystroke), NOT on the server's
    // `raceStartedAt`. Same-clock subtraction means a client whose
    // wall clock is even slightly behind the server's still measures
    // its own typing duration correctly — the previous Date.now() vs
    // raceStartedAt math clamped elapsedMs to 0 on any sub-250ms
    // skew, so the cold-start guard fired forever and the client
    // published wpm=0 for the entire race. Opponents then saw that
    // client at 0 wpm in the lineup + result panel.
    //
    // `raceStartedAt` stays in the dep array so the memo recomputes
    // when the new round begins (state.startTime alone wouldn't
    // change between rounds until the user types).
    void raceStartedAt;
    const startTime = state.startTime;
    const elapsedMs =
      startTime != null ? Math.max(0, Date.now() - startTime) : 0;
    const wpm =
      elapsedMs > 250
        ? calcWpmAndRaw(state.typed, state.words, elapsedMs, true).wpm
        : 0;
    return {
      correctChars: progressChars,
      errors,
      wpm: Math.max(0, Math.round(wpm)),
      accuracy,
      finished: state.phase === "done",
    };
  }, [
    state.typed,
    state.words,
    state.phase,
    state.totalChars,
    state.correctChars,
    state.startTime,
    raceStartedAt,
  ]);
}

/* ─── Snapshot → RaceState mapping ───────────────────────────── */

function snapshotToRaceState({
  snapshot,
  room,
  modeId,
  raceSeed,
  youName,
  youSnapshot,
}: {
  snapshot: RoomSnapshot | null;
  room: { roomId: string; sessionToken: string } | null;
  modeId: RaceModeId;
  raceSeed: number;
  youName: string;
  youSnapshot: {
    correctChars: number;
    wpm: number;
    finished: boolean;
    errors: number;
    accuracy: number;
  };
}): RaceState {
  // No room yet → synthesise the "queue" state the UI surfaces while
  // the user hasn't pressed Find race.
  if (!snapshot || !room) {
    return {
      modeId,
      phase: "queue",
      raceSeed,
      words: [],
      totalChars: 0,
      queueStartedAt: null,
      countdownStartedAt: null,
      raceStartedAt: null,
      raceEndedAt: null,
      nowMs: Date.now(),
      racers: [
        {
          id: "you",
          name: youName,
          flag: "—",
          badge: "RACER",
          isYou: true,
          bot: null,
          isHost: false,
          ready: false,
          correctChars: 0,
          wpm: 0,
          raw: 0,
          finishedAt: null,
          place: null,
          charProgress: 0,
          joinedAt: 0,
          errors: 0,
          accuracy: 100,
          disconnected: false,
        },
      ],
      feed: [],
      trace: [],
      lastLeaderId: null,
      milestonesByRacer: {},
    };
  }

  const racers: Racer[] = snapshot.racers.map((r) =>
    serverRacerToClient(r, room.sessionToken, youName, youSnapshot),
  );
  // Sort the local "you" entry to position 0 — the lane component
  // already pins you to lane 01, but the rest of the UI reads `racers`
  // in array order in places (feed, ranking pre-place).
  racers.sort((a, b) => (a.isYou === b.isYou ? 0 : a.isYou ? -1 : 1));

  return {
    modeId: (snapshot.modeId as RaceModeId) ?? modeId,
    phase: snapshot.phase,
    raceSeed,
    words: snapshot.words ?? [],
    totalChars: snapshot.totalChars,
    queueStartedAt: snapshot.matchmakingEndsAt
      ? snapshot.matchmakingEndsAt - 5_000
      : null,
    countdownStartedAt: snapshot.countdownStartedAt,
    raceStartedAt: snapshot.raceStartedAt,
    raceEndedAt: snapshot.raceEndedAt,
    nowMs: snapshot.serverNowMs,
    racers,
    feed: [],
    trace: [],
    lastLeaderId: null,
    milestonesByRacer: {},
  };
}

function serverRacerToClient(
  s: RoomRacer,
  mySessionToken: string,
  youName: string,
  youSnapshot: {
    correctChars: number;
    wpm: number;
    finished: boolean;
    errors: number;
    accuracy: number;
  },
): Racer {
  const isYou = s.id === mySessionToken;
  // Map id to its client-meaningful form: "you" / bot id / opaque
  // token. The id only matters for `playerColorFor` lookups; bots
  // need their short id stripped of the "bot:" prefix; other reals
  // get their token as-is (returning muted-foreground via the
  // default branch).
  let id: string;
  if (isYou) id = "you";
  else if (s.isBot && s.id.startsWith("bot:")) id = s.id.slice(4);
  else id = s.id;

  const botProfile = s.isBot
    ? BOTS[id as BotId] ?? null
    : null;

  return {
    id,
    name: isYou ? youName : s.name,
    flag: s.flag,
    badge: s.badge,
    isYou,
    bot: botProfile,
    isHost: s.isHost,
    ready: s.ready,
    // Prefer the local progress for "you" so a server lag-spike
    // doesn't visibly stall your own bar. Other racers use the
    // server-published progressChars.
    correctChars: isYou ? Math.max(youSnapshot.correctChars, s.progressChars) : s.progressChars,
    // Bar progress stays responsive for "you", but the WPM / raw / acc
    // NUMBERS always come from the server — the same source the table,
    // ranking, and leaderboard use — so the local racer's stats agree
    // everywhere (live ticker, headline, table, recorded result). They
    // previously used the client youSnapshot (timed from the first
    // keystroke, not the gun), which is the #6/#7 client-vs-server gap.
    wpm: s.wpm,
    raw: s.raw,
    finishedAt: s.finishedAt,
    place: s.place,
    charProgress: 0,
    joinedAt: s.joinedAt,
    errors: isYou ? Math.max(youSnapshot.errors, s.errors) : s.errors,
    accuracy: s.accuracy,
    disconnected: s.disconnected,
  };
}

/* ─── Derived timings (countdown digit, elapsed seconds) ─────── */

/** Static fallback for non-live phases (queue / lobby / finished):
 *  derives from the snapshot's own serverNowMs stamp — same clock as
 *  the anchors, so no skew. Live phases use the rAF loop above. */
function deriveTimings(state: RaceState) {
  return {
    countdownNumber:
      state.phase === "countdown"
        ? countdownDigit(state.countdownStartedAt, state.nowMs)
        : null,
    elapsedSeconds: elapsedSeconds(state.raceStartedAt, state.nowMs),
  };
}
