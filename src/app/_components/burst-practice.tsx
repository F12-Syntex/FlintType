"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { resolveBurstThreshold } from "@/lib/avg-wpm-cache";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useLifetimeStats } from "@/lib/use-lifetime-stats";
import { cn } from "@/lib/utils";
import type { KeyEvent } from "./practice-reducer";
import { usePractice } from "./practice-state";

/** Practice-side BURST runner. Renders one item at a time; user types
 *  the word, hits SPACE to commit; cleared `repsPerItem` times above
 *  `thresholdWpm` and the cursor advances. Wrong char or below
 *  threshold resets the rep counter on the current item.
 *
 *  This is a thinner sibling of `src/app/drills/_components/burst-surface.tsx`
 *  — same engine semantics, but without the drill chrome (no header,
 *  no DrillComplete overlay). When the run finishes, we dispatch
 *  `FINISH_BURST` into the shared practice reducer so the normal
 *  `<TestSummary />` renders the result screen the user expects.
 *
 *  XP: grants `XP_PER_DRILL` via `lifetimeStats.drillsCompleted` on
 *  completion, NOT `XP_PER_TEST` — BURST runs don't feed adapt and
 *  shouldn't compound with WORDS/TIME XP. */

type AttemptOutcome = "win" | "slow" | "wrong";

type State = {
  itemIdx: number;
  reps: number;
  typed: string;
  attemptStartedAt: number | null;
  lastOutcome: AttemptOutcome | null;
  totalAttempts: number;
  totalWins: number;
  finished: boolean;
  /** Most recent attempt's WPM, surfaced under the word. */
  lastWpm: number | null;
  /** When the user pressed their first key. Used as `startTime` on
   *  the synthesized FINISH_BURST so the test summary's duration is
   *  honest. Null until the first keystroke. */
  runStartedAt: number | null;
  /** Per-successful-attempt samples — fed into TestSummary's chart
   *  as the WPM trace. Built lazily so the engine state stays small. */
  winSamples: { t: number; wpm: number }[];
  /** Cleared words, in order, for the synthesized `typed[]` on
   *  FINISH_BURST. Mirrors the WORDS-mode `state.typed` shape so the
   *  result-screen accuracy / WPM calc reuses the same code path. */
  clearedTyped: string[];
};

type Action =
  | { type: "TYPE_CHAR"; char: string; now: number; targetWord: string }
  | {
      type: "CONFIRM";
      now: number;
      thresholdWpm: number;
      repsPerItem: number;
      itemsLength: number;
      targetWord: string;
    }
  | { type: "BACKSPACE" }
  | { type: "BACKSPACE_WORD" }
  | { type: "RESET_FLASH" }
  | { type: "RESET" };

const initialState: State = {
  itemIdx: 0,
  reps: 0,
  typed: "",
  attemptStartedAt: null,
  lastOutcome: null,
  totalAttempts: 0,
  totalWins: 0,
  finished: false,
  lastWpm: null,
  runStartedAt: null,
  winSamples: [],
  clearedTyped: [],
};

/** Standard 5-chars-per-word convention. Floor the duration so a 0ms
 *  attempt doesn't divide-by-zero. */
function burstWpm(charCount: number, durationMs: number): number {
  const ms = Math.max(1, durationMs);
  return (charCount / 5) * (60_000 / ms);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "RESET_FLASH":
      return { ...state, lastOutcome: null };
    case "BACKSPACE":
      if (state.typed.length === 0) return state;
      return { ...state, typed: state.typed.slice(0, -1) };
    case "BACKSPACE_WORD":
      if (state.typed.length === 0) return state;
      return { ...state, typed: "", attemptStartedAt: null };
    case "TYPE_CHAR": {
      if (state.finished) return state;
      const target = action.targetWord;
      const nextTyped = state.typed + action.char;
      const idx = nextTyped.length - 1;
      const expected = target[idx];
      const startedAt = state.attemptStartedAt ?? action.now;
      const runStartedAt = state.runStartedAt ?? action.now;

      if (expected === undefined || action.char !== expected) {
        return {
          ...state,
          typed: "",
          attemptStartedAt: null,
          reps: 0,
          lastOutcome: "wrong",
          totalAttempts: state.totalAttempts + 1,
          runStartedAt,
        };
      }
      return {
        ...state,
        typed: nextTyped,
        attemptStartedAt: startedAt,
        runStartedAt,
      };
    }
    case "CONFIRM": {
      if (state.finished) return state;
      const target = action.targetWord;
      if (state.typed.length !== target.length) return state;
      if (state.typed !== target) return state;
      if (state.attemptStartedAt == null) return state;

      const wpm = burstWpm(target.length, action.now - state.attemptStartedAt);
      const wpmRounded = Math.round(wpm);
      const fast = wpm >= action.thresholdWpm;
      const runStartedAt = state.runStartedAt ?? action.now;
      if (!fast) {
        return {
          ...state,
          typed: "",
          attemptStartedAt: null,
          reps: 0,
          lastOutcome: "slow",
          totalAttempts: state.totalAttempts + 1,
          lastWpm: wpmRounded,
          runStartedAt,
        };
      }
      const nextReps = state.reps + 1;
      const justFinishedItem = nextReps >= action.repsPerItem;
      const finishedRun =
        justFinishedItem && state.itemIdx >= action.itemsLength - 1;
      return {
        ...state,
        typed: "",
        attemptStartedAt: null,
        reps: justFinishedItem ? 0 : nextReps,
        itemIdx: justFinishedItem ? state.itemIdx + 1 : state.itemIdx,
        lastOutcome: "win",
        totalAttempts: state.totalAttempts + 1,
        totalWins: state.totalWins + 1,
        finished: finishedRun,
        lastWpm: wpmRounded,
        runStartedAt,
        winSamples: [
          ...state.winSamples,
          { t: action.now - runStartedAt, wpm: wpmRounded },
        ],
        clearedTyped: justFinishedItem
          ? [...state.clearedTyped, target]
          : state.clearedTyped,
      };
    }
  }
}

export function BurstPractice() {
  const { state: practice, dispatch: practiceDispatch, restart } = usePractice();
  const items = practice.words;
  const itemsLength = items.length;
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const { incrementDrillsCompleted } = useLifetimeStats();

  // Threshold and reps reads — auto-WPM resolution happens once at
  // mount; the user can edit the pref to bypass.
  const thresholdWpm = useMemo(
    () => resolveBurstThreshold(behaviour.burstThreshold),
    [behaviour.burstThreshold],
  );
  const repsPerItem = Math.max(1, appearance.burstReps);

  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const targetWord = items[state.itemIdx] ?? "";

  // Reset the engine whenever the practice words change (mode/length
  // pick, restart). The practice provider regenerates state.words on
  // those transitions; reset on identity change keeps the local
  // engine state in sync.
  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [items]);

  // Brief outcome flash so the win/slow/wrong feedback is visible
  // without lingering.
  useEffect(() => {
    if (state.lastOutcome == null) return;
    const id = setTimeout(() => dispatch({ type: "RESET_FLASH" }), 350);
    return () => clearTimeout(id);
  }, [state.lastOutcome, state.itemIdx]);

  // On finish: synthesize the result-screen stats + drop them into the
  // practice reducer so <TestSummary /> renders the standard view.
  // Ref guard so the grant + finish dispatch fire exactly once per
  // mounted run.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!state.finished || finishedRef.current) return;
    finishedRef.current = true;
    const endMs = Date.now();
    const startMs = state.runStartedAt ?? endMs;
    // Synthesize KeyEvent[]: one "correct" event per char of every
    // cleared word. The result-screen WPM math reads through this; we
    // don't have per-char timings inside a burst, so each char shares
    // the attempt's commit timestamp relative to startMs.
    const events: KeyEvent[] = [];
    let charCount = 0;
    for (let wIdx = 0; wIdx < state.clearedTyped.length; wIdx++) {
      const w = state.clearedTyped[wIdx]!;
      const sample = state.winSamples[wIdx];
      const t = sample?.t ?? 0;
      for (let i = 0; i < w.length; i++) {
        events.push({
          t,
          expected: w[i]!,
          typed: w[i]!,
          correct: true,
          wordIndex: wIdx,
        });
        charCount++;
      }
    }
    // totalChars also counts the chars from failed attempts so the
    // accuracy reflects honest miss rate (totalAttempts vs totalWins
    // is the per-attempt accuracy, but TestSummary's accuracy column
    // wants char-level). One word's worth of failed chars per
    // non-winning attempt is a fair approximation given we don't
    // record key-level failures here.
    const failedAttempts = Math.max(
      0,
      state.totalAttempts - state.totalWins,
    );
    const avgWordLen =
      state.clearedTyped.length > 0
        ? charCount / state.clearedTyped.length
        : 0;
    const failedChars = Math.round(failedAttempts * avgWordLen);
    practiceDispatch({
      type: "FINISH_BURST",
      startMs,
      endMs,
      typed: [...state.clearedTyped],
      events,
      totalChars: charCount + failedChars,
      correctChars: charCount,
    });
    incrementDrillsCompleted();
  }, [
    state.finished,
    state.runStartedAt,
    state.clearedTyped,
    state.winSamples,
    state.totalAttempts,
    state.totalWins,
    practiceDispatch,
    incrementDrillsCompleted,
  ]);

  // Reset the finish guard when the practice words swap (restart).
  useEffect(() => {
    finishedRef.current = false;
  }, [items]);

  // Keyboard handler. Owns its own listener (separate from the
  // shared InputCapture) because the burst flow is space-confirms-
  // attempt rather than space-advances-word.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const wordWise =
        e.key === "Backspace" && (e.ctrlKey || e.altKey || e.metaKey);
      if (!wordWise && (e.ctrlKey || e.metaKey || e.altKey)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: wordWise ? "BACKSPACE_WORD" : "BACKSPACE" });
        return;
      }
      // Esc → restart the run via the practice provider, which
      // regenerates state.words and bounces the local engine via the
      // items-dep effect above.
      if (e.key === "Escape") {
        e.preventDefault();
        restart();
        return;
      }
      if (e.key.length === 1) {
        const cur = stateRef.current;
        const target = items[cur.itemIdx] ?? "";
        if (e.key === " ") {
          if (
            cur.typed.length === target.length &&
            cur.typed === target &&
            cur.attemptStartedAt != null
          ) {
            e.preventDefault();
            dispatch({
              type: "CONFIRM",
              now: Date.now(),
              thresholdWpm,
              repsPerItem,
              itemsLength,
              targetWord: target,
            });
            return;
          }
          // Mid-attempt accidental space — swallow.
          return;
        }
        e.preventDefault();
        dispatch({
          type: "TYPE_CHAR",
          char: e.key,
          now: Date.now(),
          targetWord: target,
        });
      }
    },
    [items, itemsLength, thresholdWpm, repsPerItem, restart],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const ready =
    state.typed.length === targetWord.length &&
    state.typed === targetWord &&
    state.attemptStartedAt != null &&
    state.lastOutcome == null;

  return (
    <section className="flex min-h-0 flex-1 flex-col items-stretch gap-8 sm:gap-12">
      {/* Top stat strip — sparse, two values: item progress + reps streak */}
      <div className="flex items-center justify-center gap-8 text-center font-mono">
        <Stat label="item" value={`${state.itemIdx}/${itemsLength}`} />
        <Stat label="streak" value={`${state.reps}/${repsPerItem}`} />
        <Stat label="threshold" value={`${thresholdWpm} wpm`} />
        {state.lastWpm != null ? (
          <Stat label="last" value={`${state.lastWpm} wpm`} accent />
        ) : null}
      </div>

      {/* Centred word — the burst target. Tints by lastOutcome. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
        <BurstWord
          word={targetWord}
          typed={state.typed}
          outcome={state.lastOutcome}
          ready={ready}
        />
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {ready
            ? "press space to commit"
            : state.lastOutcome === "wrong"
              ? "wrong char — try again"
              : state.lastOutcome === "slow"
                ? "too slow — reset"
                : state.typed.length === 0
                  ? "type the word, then space"
                  : ""}
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-semibold tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function BurstWord({
  word,
  typed,
  outcome,
  ready,
}: {
  word: string;
  typed: string;
  outcome: AttemptOutcome | null;
  ready: boolean;
}) {
  const tint =
    outcome === "win"
      ? "text-primary"
      : outcome === "wrong" || outcome === "slow"
        ? "text-destructive"
        : ready
          ? "text-primary"
          : "text-foreground";
  return (
    <div
      className={cn(
        "text-5xl font-bold tracking-tight transition-colors sm:text-7xl",
        tint,
      )}
    >
      {word.split("").map((ch, i) => {
        const typedCh = typed[i];
        const state =
          typedCh === undefined
            ? "untyped"
            : typedCh === ch
              ? "typed"
              : "wrong";
        return (
          <span
            key={i}
            className={cn(
              state === "untyped" && "text-muted-foreground/60",
              state === "wrong" && "text-destructive",
            )}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}
