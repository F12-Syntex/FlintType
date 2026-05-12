"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { calcWpmAndRaw, countChars } from "@/lib/wpm";
import { usePractice } from "../../_components/practice-state";
import {
  BOT_TICK_MS,
  COUNTDOWN_SECONDS,
  instantBotWpm,
  TRACE_SAMPLE_MS,
  type RaceModeId,
} from "./race-data";
import { freshState, reducer } from "./race-reducer";
import type { Action, RaceState } from "./race-types";

export type RaceCtx = {
  state: RaceState;
  modeId: RaceModeId;
  setModeId: (modeId: RaceModeId) => void;
  startCountdown: () => void;
  restart: () => void;
  dispatch: React.Dispatch<Action>;
  /** Countdown integer (3..2..1..0). Null outside countdown. */
  countdownNumber: number | null;
  /** Elapsed seconds since GO. Zero in lobby / countdown. */
  elapsedSeconds: number;
};

const Ctx = createContext<RaceCtx | null>(null);

/** Reads the user's typing snapshot from PracticeContext (mounted by
 *  the parent shell). The reducer never reaches across into
 *  PracticeContext directly — the bot tick gets a fresh snapshot
 *  through TICK args so the reducer stays pure.
 *
 *  We deliberately drive WPM off race-clock time (raceStartedAt →
 *  raceNowMs) rather than practice's internal startTime so the user
 *  and the bots share the same clock. Without this they diverge: a
 *  user who pauses for 2s after GO would otherwise show a higher WPM
 *  than the bot they're trailing. `correctChars` includes the spaces
 *  between completed words so the lane progress bars step uniformly. */
function useYouSnapshot(raceStartedAt: number | null, raceNowMs: number) {
  const { state } = usePractice();
  return useMemo(() => {
    const counts = countChars(state.typed, state.words, true);
    const correctChars = counts.allCorrectChars + counts.correctSpaces;
    const elapsedMs =
      raceStartedAt != null ? Math.max(0, raceNowMs - raceStartedAt) : 0;
    const wpm =
      elapsedMs > 250
        ? calcWpmAndRaw(state.typed, state.words, elapsedMs, true).wpm
        : 0;
    return {
      correctChars,
      wpm: Math.max(0, Math.round(wpm)),
      finished: state.phase === "done",
    };
  }, [state.typed, state.words, state.phase, raceStartedAt, raceNowMs]);
}

/** Mounted inside the parent shell's PracticeProvider + InputCapture
 *  tree. Owns the race phase machine, bot simulation, feed events
 *  and trace history. The shell controls mode/seed (lockedWords on
 *  the practice provider come from the same seed), so this provider
 *  just receives modeId + the callbacks the UI needs. The whole
 *  subtree is keyed in the shell so a mode change or restart resets
 *  both practice and race state in lockstep. */
export function RaceProvider({
  modeId,
  raceSeed,
  setModeId,
  restartShell,
  children,
}: {
  modeId: RaceModeId;
  raceSeed: number;
  setModeId: (next: RaceModeId) => void;
  restartShell: () => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    freshState(modeId, raceSeed, Date.now()),
  );

  const you = useYouSnapshot(state.raceStartedAt, state.nowMs);
  const youRef = useRef(you);
  youRef.current = you;

  // Block printable typing during lobby + countdown so an over-eager
  // early keystroke doesn't bleed into practice state before GO. We
  // intercept at the capture phase so the InputCapture's onKeyDown
  // never sees the event. Letting non-printable keys through keeps
  // OS shortcuts (cmd-tab, ctrl-r, etc.) working in the lobby.
  useEffect(() => {
    if (state.phase === "racing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1 && e.key !== "Backspace" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [state.phase]);

  // Countdown + race tick. One interval drives both phases — the
  // countdown number falls out of state.countdownStartedAt and
  // state.nowMs, refreshed on every TICK.
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

  // Once-per-second trace sampler. Stored in state but only drawn
  // in the post-race results panel — no live curve to distract from
  // typing during the run.
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
          wpmByRacer[r.id] = Math.round(
            instantBotWpm(r.bot, elapsedMs, s.raceSeed),
          );
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
      const left =
        COUNTDOWN_SECONDS * 1000 - (state.nowMs - state.countdownStartedAt);
      countdownNumber = Math.max(0, Math.ceil(left / 1000));
    }
    const elapsedSeconds =
      state.raceStartedAt != null
        ? Math.max(0, Math.floor((state.nowMs - state.raceStartedAt) / 1000))
        : 0;
    return { countdownNumber, elapsedSeconds };
  }, [state]);

  const value = useMemo<RaceCtx>(
    () => ({
      state,
      modeId,
      setModeId,
      startCountdown: () =>
        dispatch({ type: "START_COUNTDOWN", now: Date.now() }),
      restart: restartShell,
      dispatch,
      ...derived,
    }),
    [state, modeId, setModeId, restartShell, derived],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRace(): RaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRace must be used inside RaceProvider");
  return ctx;
}
