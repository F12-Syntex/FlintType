"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  BOT_TICK_MS,
  COUNTDOWN_SECONDS,
  cumulativeWpm,
  instantBotWpm,
  TRACE_SAMPLE_MS,
} from "./race-data";
import { freshState, reducer, wordIdxFromChars } from "./race-reducer";
import type { Action, RaceState, TraceSample } from "./race-types";

export type RaceCtx = {
  state: RaceState;
  startCountdown: () => void;
  restart: () => void;
  dispatch: React.Dispatch<Action>;
  /** Per-racer cursor — wordIdx + charIdx — derived once per render
   *  so the lanes / passage don't recompute independently. */
  cursors: { wordIdx: number; charIdx: number }[];
  /** Your live accuracy percent. */
  yourAccuracy: number;
  /** Your live WPM, computed cumulatively since GO. */
  yourWpm: number;
  /** Countdown integer (3..2..1..0). Null outside the countdown phase. */
  countdownNumber: number | null;
  /** Elapsed seconds since GO. Zero in lobby / countdown. */
  elapsedSeconds: number;
};

const Ctx = createContext<RaceCtx | null>(null);

export function RaceProvider({ children }: { children: ReactNode }) {
  // Stable initial seed for SSR so the server's empty render doesn't
  // disagree with the client's hydration pass. The first useEffect
  // below re-seeds against the wall clock once mounted.
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    freshState(1, 0),
  );

  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    dispatch({ type: "RESTART", now: Date.now(), seed: Date.now() | 0 });
  }, []);

  // One interval covers countdown + racing. Cheap, since BOT_TICK_MS
  // is short enough (50ms) that we don't perceive countdown lag.
  useEffect(() => {
    if (state.phase !== "countdown" && state.phase !== "racing") return;
    const id = setInterval(() => {
      const now = Date.now();
      if (
        state.phase === "countdown" &&
        state.countdownStartedAt != null &&
        now - state.countdownStartedAt >= COUNTDOWN_SECONDS * 1000
      ) {
        dispatch({ type: "START_RACE", now });
        return;
      }
      dispatch({ type: "TICK", now });
    }, BOT_TICK_MS);
    return () => clearInterval(id);
  }, [state.phase, state.countdownStartedAt]);

  // Per-second trace sampler. We send the sample through the
  // reducer so the trace history is in state (not in a ref) — the
  // SVG `<RaceTrace>` reads state.trace directly.
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
          const lastSample = s.trace[s.trace.length - 1];
          wpmByRacer[r.id] = lastSample?.wpmByRacer[r.id] ?? r.wpm;
          continue;
        }
        if (r.bot) {
          wpmByRacer[r.id] = Math.round(
            instantBotWpm(r.bot, elapsedMs, s.raceSeed),
          );
        } else {
          wpmByRacer[r.id] = Math.round(cumulativeWpm(r.correctChars, elapsedMs));
        }
      }
      const trace: TraceSample = {
        t: Math.floor(elapsedMs / 1000),
        wpmByRacer,
      };
      dispatch({ type: "TICK", now: Date.now(), trace });
    }, TRACE_SAMPLE_MS);
    return () => clearInterval(id);
  }, [state.phase, state.raceStartedAt]);

  const derived = useMemo(() => {
    const cursors = state.racers.map((r) => {
      const wIdx = wordIdxFromChars(state.charsBeforeWord, r.correctChars);
      const charIdx = r.correctChars - state.charsBeforeWord[wIdx]!;
      return { wordIdx: wIdx, charIdx };
    });
    const you = state.racers.find((r) => r.isYou)!;
    const totalKeystrokes = you.correctChars + you.errorChars;
    const yourAccuracy =
      totalKeystrokes === 0
        ? 100
        : Math.round((you.correctChars / totalKeystrokes) * 1000) / 10;
    let yourWpm = 0;
    if (state.raceStartedAt != null) {
      const elapsedMs = state.nowMs - state.raceStartedAt;
      yourWpm = Math.round(cumulativeWpm(you.correctChars, elapsedMs));
    }
    let countdownNumber: number | null = null;
    if (state.phase === "countdown" && state.countdownStartedAt != null) {
      const left =
        COUNTDOWN_SECONDS * 1000 - (state.nowMs - state.countdownStartedAt);
      countdownNumber = Math.max(0, Math.ceil(left / 1000));
    }
    const elapsedSeconds =
      state.raceStartedAt != null
        ? Math.max(0, Math.floor((state.nowMs - state.raceStartedAt) / 1000))
        : 0;
    return { cursors, yourAccuracy, yourWpm, countdownNumber, elapsedSeconds };
  }, [state]);

  const startCountdown = useCallback(
    () => dispatch({ type: "START_COUNTDOWN", now: Date.now() }),
    [],
  );
  const restart = useCallback(
    () => dispatch({ type: "RESTART", now: Date.now(), seed: Date.now() | 0 }),
    [],
  );

  const value = useMemo<RaceCtx>(
    () => ({ state, dispatch, startCountdown, restart, ...derived }),
    [state, derived, startCountdown, restart],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRace(): RaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRace must be used inside RaceProvider");
  return ctx;
}
