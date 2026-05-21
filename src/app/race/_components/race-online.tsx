"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBackend } from "@/lib/backend";
import { calcWpmAndRaw } from "@/lib/wpm";
import { usePractice } from "../../_components/practice-state";
import type { RoomRacer, RoomSnapshot } from "@/types/race";
import { BOTS, type BotId } from "./race-data";
import { useRaceRoom } from "./use-race-room";
import { type RaceCtx, RaceContext } from "./race-context";
import type { Racer, RaceState } from "./race-types";
import type { RaceModeId } from "./race-data";

/** Online RaceProvider — server-authoritative race for the passage
 *  modes (1v1v1v1 / 1v1 / sprint / endurance). Holds the room handle
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

  const rematch = useCallback(() => {
    void rematchRoom();
  }, [rematchRoom]);

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

  // Local-clock tick during countdown / racing. The server snapshot
  // only re-broadcasts on state changes; during the 3-second
  // countdown nothing changes server-side, so `snapshot.serverNowMs`
  // stays fixed and the derived countdownNumber would freeze at 3.
  // A 200ms local tick keeps the digit honest (and the racing
  // elapsed-second readouts ticking) without depending on the server
  // pushing time updates we'd just throw away.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (snapshot?.phase !== "countdown" && snapshot?.phase !== "racing") return;
    const id = setInterval(() => setTick((t) => (t + 1) & 0x7fffffff), 200);
    return () => clearInterval(id);
  }, [snapshot?.phase]);

  const derived = useMemo(
    // Recompute against the live wall clock so the countdown digit
    // re-renders every 200ms even while the server snapshot is idle.
    () =>
      deriveTimings(
        snapshot?.phase === "countdown" || snapshot?.phase === "racing"
          ? { ...state, nowMs: Date.now() }
          : state,
      ),
    // `tick` is read implicitly via Date.now() above — list it in the
    // deps so the memo invalidates on each interval fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, tick],
  );

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
          correctChars: 0,
          wpm: 0,
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
    // Prefer the local progress for "you" so a server lag-spike
    // doesn't visibly stall your own bar. Other racers use the
    // server-published progressChars.
    correctChars: isYou ? Math.max(youSnapshot.correctChars, s.progressChars) : s.progressChars,
    wpm: isYou ? youSnapshot.wpm || s.wpm : s.wpm,
    finishedAt: s.finishedAt,
    place: s.place,
    charProgress: 0,
    joinedAt: s.joinedAt,
    errors: isYou ? Math.max(youSnapshot.errors, s.errors) : s.errors,
    accuracy: isYou ? youSnapshot.accuracy : s.accuracy,
    disconnected: s.disconnected,
  };
}

/* ─── Derived timings (countdown digit, elapsed seconds) ─────── */

function deriveTimings(state: RaceState) {
  let countdownNumber: number | null = null;
  if (state.phase === "countdown" && state.countdownStartedAt != null) {
    // Server-fixed 3s countdown. We use the server-supplied wall
    // clock (nowMs) so two clients with skewed device clocks still
    // see the same digit at the same moment.
    const left = 3_000 - (state.nowMs - state.countdownStartedAt);
    countdownNumber = Math.max(0, Math.ceil(left / 1000));
  }
  const elapsedSeconds =
    state.raceStartedAt != null
      ? Math.max(0, Math.floor((state.nowMs - state.raceStartedAt) / 1000))
      : 0;
  return { countdownNumber, elapsedSeconds };
}
