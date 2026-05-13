"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { calcWpmAndRaw } from "@/lib/wpm";
import { usePractice } from "../../_components/practice-state";
import { OnlineRaceProvider } from "./race-online";
import { RaceContext, useRace as useRaceShared } from "./race-context";
import {
  BOT_TICK_MS,
  RACE_MODES,
  TRACE_SAMPLE_MS,
  instantBotWpm,
  type RaceModeId,
} from "./race-data";
import { freshState, reducer } from "./race-reducer";
import type { RaceCtx } from "./race-context";
import type { Action } from "./race-types";

/** Top-level RaceProvider — chooses between the offline reducer
 *  (burst minigame, locally driven by the existing reducer) and the
 *  online provider (passage modes, server-driven via SSE).
 *
 *  Burst stays offline for the moment because its rep-streak loop
 *  (mistype = streak reset, threshold-gated bursts) is fundamentally
 *  different from the per-keystroke passage model the server room
 *  tracks. Bringing burst online is a follow-up — the server's
 *  `progressChars` would encode `itemIdx × repsPerItem + reps` and
 *  bots would tick reps/sec instead of chars/sec. */
export function RaceProvider(props: {
  modeId: RaceModeId;
  raceSeed: number;
  withQueue: boolean;
  youName: string;
  setModeId: (next: RaceModeId) => void;
  restartShell: () => void;
  enterQueueShell?: () => void;
  /** Optional pre-joined online room — used by challenge pages so the
   *  provider doesn't run its own queue handshake (the page already
   *  has roomId + sessionToken from challenge.create/join). */
  initialOnlineRoom?: { roomId: string; sessionToken: string } | null;
  /** Shell-supplied queue-entry callback. The online provider hands
   *  control back to the shell so the shell can fetch words from
   *  the server and re-key PracticeProvider before the racing UI
   *  needs them. */
  onlineEnterQueue?: () => void;
  onlineAbandon?: () => void;
  children: ReactNode;
}) {
  const mode = RACE_MODES[props.modeId];
  if (mode.kind === "burst") {
    return <OfflineRaceProvider {...props}>{props.children}</OfflineRaceProvider>;
  }
  return (
    <OnlineRaceProvider
      {...props}
      initialRoom={props.initialOnlineRoom ?? null}
      onEnterQueue={props.onlineEnterQueue}
      onAbandon={props.onlineAbandon}
    >
      {props.children}
    </OnlineRaceProvider>
  );
}

export const useRace = useRaceShared;

/* ─── Offline provider (burst) ────────────────────────────────── */

function useYouSnapshot(raceStartedAt: number | null, raceNowMs: number) {
  const { state } = usePractice();
  return useMemo(() => {
    let progressChars = 0;
    for (let i = 0; i < state.typed.length; i += 1) {
      const t = state.typed[i] ?? "";
      const w = state.words[i] ?? "";
      progressChars += Math.min(t.length, w.length);
      if (i < state.typed.length - 1) progressChars += 1;
    }
    const elapsedMs =
      raceStartedAt != null ? Math.max(0, raceNowMs - raceStartedAt) : 0;
    const wpm =
      elapsedMs > 250
        ? calcWpmAndRaw(state.typed, state.words, elapsedMs, true).wpm
        : 0;
    return {
      correctChars: progressChars,
      wpm: Math.max(0, Math.round(wpm)),
      finished: state.phase === "done",
    };
  }, [state.typed, state.words, state.phase, raceStartedAt, raceNowMs]);
}

function OfflineRaceProvider({
  modeId,
  raceSeed,
  withQueue,
  youName,
  setModeId,
  restartShell,
  // Accepted for API parity with OnlineRaceProvider (race-online.tsx)
  // even though offline play has no separate queue surface to bounce
  // back to. Keeping the prop here lets <RaceShell> hand the same
  // bag to both providers without conditionals.
  enterQueueShell: _enterQueueShell,
  children,
}: {
  modeId: RaceModeId;
  raceSeed: number;
  withQueue: boolean;
  youName: string;
  setModeId: (next: RaceModeId) => void;
  restartShell: () => void;
  enterQueueShell?: () => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    freshState(modeId, raceSeed, Date.now(), withQueue, youName),
  );
  const countdownSeconds = 3;

  const you = useYouSnapshot(state.raceStartedAt, state.nowMs);
  const youRef = useRef(you);
  youRef.current = you;

  useEffect(() => {
    const isRacing = state.phase === "racing";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (isRacing) return;
        if (state.phase === "queue") {
          dispatch({ type: "ENTER_QUEUE", now: Date.now() });
        } else if (state.phase === "finished") {
          restartShell();
        }
        return;
      }
      if (isRacing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1 && e.key !== "Backspace" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [state.phase, restartShell]);

  // Challenge lobbies are host-controlled — the user (host) must
  // press "Start race" themselves. Matchmaking lobbies auto-progress
  // 700 ms after the bots finish joining so the loop stays
  // single-click. `_enterQueueShell` is the canonical signal that the
  // shell mounted this provider from a challenge room (the offline
  // provider only receives that prop on burst challenges; see
  // race-shell.tsx). We treat any provider mounted with `withQueue=false`
  // and a non-queue starting phase as a challenge lobby — that's the
  // exact shape RaceShell uses for /race/c/<slug> burst races.
  const isChallengeLobby = !withQueue;
  useEffect(() => {
    if (state.phase !== "lobby") return;
    if (isChallengeLobby) return; // wait for the manual Start
    const id = setTimeout(() => {
      dispatch({ type: "START_COUNTDOWN", now: Date.now() });
    }, 700);
    return () => clearTimeout(id);
  }, [state.phase, isChallengeLobby]);

  useEffect(() => {
    if (state.phase !== "matching") return;
    const botIdxs = state.racers
      .map((r, i) => (r.bot != null && r.joinedAt == null ? i : -1))
      .filter((i) => i >= 0);
    const baseDelays = [600, 1450, 2350, 3200];
    const timers = botIdxs.map((idx, n) =>
      window.setTimeout(() => {
        dispatch({ type: "BOT_JOIN", botIdx: idx, now: Date.now() });
      }, baseDelays[n] ?? 600 + n * 800),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "countdown" && state.phase !== "racing") return;
    const id = setInterval(() => {
      const now = Date.now();
      if (
        state.phase === "countdown" &&
        state.countdownStartedAt != null &&
        now - state.countdownStartedAt >= countdownSeconds * 1000
      ) {
        dispatch({ type: "START_RACE", now });
        return;
      }
      const y = youRef.current;
      dispatch({
        type: "TICK",
        now,
        youCorrectChars: y.correctChars,
        youWpm: y.wpm,
        youFinished: y.finished,
      });
    }, BOT_TICK_MS);
    return () => clearInterval(id);
  }, [state.phase, state.countdownStartedAt]);

  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (state.phase !== "racing" || state.raceStartedAt == null) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== "racing" || s.raceStartedAt == null) return;
      const elapsedMs = Date.now() - s.raceStartedAt;
      const wpmByRacer: Record<string, number> = {};
      for (const r of s.racers) {
        if (r.finishedAt != null) {
          const last = s.trace[s.trace.length - 1];
          wpmByRacer[r.id] = last?.wpmByRacer[r.id] ?? r.wpm;
          continue;
        }
        if (r.bot) {
          wpmByRacer[r.id] = Math.round(instantBotWpm(r.bot, elapsedMs, s.raceSeed));
        } else {
          wpmByRacer[r.id] = youRef.current.wpm;
        }
      }
      const y = youRef.current;
      dispatch({
        type: "TICK",
        now: Date.now(),
        youCorrectChars: y.correctChars,
        youWpm: y.wpm,
        youFinished: y.finished,
        trace: { t: Math.floor(elapsedMs / 1000), wpmByRacer },
      });
    }, TRACE_SAMPLE_MS);
    return () => clearInterval(id);
  }, [state.phase, state.raceStartedAt]);

  const derived = useMemo(() => {
    let countdownNumber: number | null = null;
    if (state.phase === "countdown" && state.countdownStartedAt != null) {
      const left = countdownSeconds * 1000 - (state.nowMs - state.countdownStartedAt);
      countdownNumber = Math.max(0, Math.ceil(left / 1000));
    }
    const elapsedSeconds =
      state.raceStartedAt != null
        ? Math.max(0, Math.floor((state.nowMs - state.raceStartedAt) / 1000))
        : 0;
    return { countdownNumber, elapsedSeconds };
  }, [state]);

  const enterQueue = useCallback(
    () => dispatch({ type: "ENTER_QUEUE", now: Date.now() }),
    [],
  );
  const startCountdown = useCallback(
    () => dispatch({ type: "START_COUNTDOWN", now: Date.now() }),
    [],
  );
  // Burst is offline — abandon must reset locally, NOT call the
  // shell's `enterQueueShell` (which was wired to the online
  // `backend.race.queue` POST and would auto-start a fresh race the
  // moment the user clicked Abandon). Local RESTART with
  // withQueue=true drops back to the queue surface without firing
  // any matchmaking. Same for rematch — the user expects an explicit
  // Find race click, not an automatic re-queue.
  const abandon = useCallback(
    () =>
      dispatch({
        type: "RESTART",
        seed: Date.now() | 0,
        now: Date.now(),
        withQueue: true,
      }),
    [],
  );
  const restart = restartShell;
  const rematch = abandon;

  const ctx = useMemo<RaceCtx>(
    () => ({
      state,
      modeId,
      setModeId,
      enterQueue,
      startCountdown,
      restart,
      abandon,
      rematch,
      dispatch: dispatch as (a: Action) => void,
      isChallenge: isChallengeLobby,
      ...derived,
    }),
    [
      state,
      modeId,
      setModeId,
      enterQueue,
      startCountdown,
      restart,
      abandon,
      rematch,
      derived,
      isChallengeLobby,
    ],
  );

  return <RaceContext.Provider value={ctx}>{children}</RaceContext.Provider>;
}
