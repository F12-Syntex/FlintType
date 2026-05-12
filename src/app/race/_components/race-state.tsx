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
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { calcWpmAndRaw } from "@/lib/wpm";
import { usePractice } from "../../_components/practice-state";
import {
  BOT_TICK_MS,
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
  /** Moves out of queue → matching; bots will join over the next few
   *  seconds and the phase auto-flips to lobby. */
  enterQueue: () => void;
  startCountdown: () => void;
  /** Race-again: restart the same mode with a new passage. Skips
   *  queue/matching — bots stay at the table, auto-countdown fires. */
  restart: () => void;
  /** Abandon: leave the current race and drop back to the queue
   *  state with no bots present. The user has to actively press
   *  Find race to start a new match — no auto-countdown. */
  abandon: () => void;
  /** Force re-matching: same mode + new bot lineup intro. */
  rematch: () => void;
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
    // Race progress = cursor position in the passage, NOT correct-char
    // count. A user who mistypes still moves forward through the
    // passage (the cursor advances, words commit on space even when
    // mis-typed) — pinning the lane bar on `correctChars` would stall
    // it on every error and undercount how far they actually are. For
    // each typed word, the user has advanced past `min(typed.len,
    // word.len)` chars of the target, plus one space between completed
    // words. Extras (typed > target) cap at the word length so a long
    // overshoot doesn't push progress past 100 %.
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
  withQueue,
  youName,
  setModeId,
  restartShell,
  enterQueueShell,
  children,
}: {
  modeId: RaceModeId;
  raceSeed: number;
  /** Whether the initial phase is `queue` (fresh entry / mode change)
   *  or `lobby` (race-again — bots already at the table). */
  withQueue: boolean;
  /** Display name to use for the human racer in lanes / feed / strip
   *  (e.g. `@saif`). Pulled from Clerk in the parent shell so the
   *  provider stays decoupled from the auth library. Defaults to
   *  `@you` when unauthenticated. */
  youName: string;
  setModeId: (next: RaceModeId) => void;
  restartShell: () => void;
  /** Called by useRace().enterQueue — forwarded to the shell so it
   *  can rebuild the subtree with `withQueue=true` if the user
   *  re-enters from finished or wants to refresh the bot roster. */
  enterQueueShell?: () => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    freshState(modeId, raceSeed, Date.now(), withQueue, youName),
  );
  const { prefs: appearance } = useAppearancePrefs();
  const countdownSeconds = Math.max(
    1,
    Math.min(5, appearance.multiplayerCountdownSeconds),
  );

  const you = useYouSnapshot(state.raceStartedAt, state.nowMs);
  const youRef = useRef(you);
  youRef.current = you;

  // Window-level keydown guard for the race surface.
  //
  // 1) Tab + Escape are always swallowed at the capture phase so
  //    practice-state's wired-up restart action can't reach them
  //    and wipe the user's typed progress mid-race.
  //
  // 2) Outside the racing phase, Tab starts a new race — same
  //    intent practice uses for Tab=restart, mapped to the race
  //    equivalent (Find race in queue, Race again in finished).
  //
  // 3) Outside racing we also swallow printable typing + Backspace
  //    + Space so an over-eager press doesn't bleed into practice
  //    state before GO fires.
  useEffect(() => {
    const isRacing = state.phase === "racing";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (isRacing) return;
        // Tab outside of racing is the "start a new race" shortcut.
        // The action it triggers depends on phase so the keystroke
        // mirrors whichever button is currently visible.
        if (state.phase === "queue") {
          dispatch({ type: "ENTER_QUEUE", now: Date.now() });
        } else if (state.phase === "finished") {
          restartShell();
        }
        // matching / lobby / countdown: deliberately a no-op — the
        // race is mid-progression, no second commit needed.
        return;
      }
      if (isRacing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1 && e.key !== "Backspace" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [state.phase, restartShell]);

  // Auto-start the countdown the moment the lobby fills. The user
  // just watched the lobby populate — they shouldn't need to commit
  // again with a click. A brief delay (~700ms) lets the final racer
  // land visually before the countdown overlay drops.
  useEffect(() => {
    if (state.phase !== "lobby") return;
    const id = setTimeout(() => {
      dispatch({ type: "START_COUNTDOWN", now: Date.now() });
    }, 700);
    return () => clearTimeout(id);
  }, [state.phase]);

  // Matching phase: bots stagger in via a schedule of setTimeouts.
  // The first join lands ~600ms in (gives the user a beat to read
  // "finding racers"); each subsequent join is +700–900ms so the
  // wait reads as a few opponents queuing up rather than an instant
  // pop. After the last bot, the BOT_JOIN reducer flips to lobby.
  useEffect(() => {
    if (state.phase !== "matching") return;
    const botIdxs = state.racers
      .map((r, i) => (r.bot != null && r.joinedAt == null ? i : -1))
      .filter((i) => i >= 0);
    const baseDelays = [600, 1450, 2350, 3200]; // up to 4 bots
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
  }, [state.phase, state.countdownStartedAt, countdownSeconds]);

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
        countdownSeconds * 1000 - (state.nowMs - state.countdownStartedAt);
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
      enterQueue: () => dispatch({ type: "ENTER_QUEUE", now: Date.now() }),
      startCountdown: () =>
        dispatch({ type: "START_COUNTDOWN", now: Date.now() }),
      restart: restartShell,
      abandon: () => enterQueueShell?.(),
      rematch: () => enterQueueShell?.(),
      dispatch,
      ...derived,
    }),
    [state, modeId, setModeId, restartShell, enterQueueShell, derived],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRace(): RaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRace must be used inside RaceProvider");
  return ctx;
}
