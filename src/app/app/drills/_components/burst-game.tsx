"use client";

import { ArrowLeft, Zap } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StreakGrid } from "./streak-grid";

/** A burst minigame: type each item in `items` correctly above the
 *  WPM threshold, `repsPerItem` consecutive times. Hit the rep
 *  count → advance to the next item. A wrong character or a too-slow
 *  attempt resets the rep counter on the current item.
 *
 *  Used for the burst-1000 (items = common words) and trigram-burst
 *  (items = trigrams) drills — same engine, different data. */
type BurstGameProps = {
  /** Display title at the top of the surface (e.g. "Burst 1000"). */
  title: string;
  /** Single-line context strip — drill subtitle. */
  subtitle: string;
  /** Items to drill, in order. Each item is a single string the user
   *  must type as one attempt (a word, a trigram, …). */
  items: readonly string[];
  /** Burst WPM the user must hit per attempt. Below this and the
   *  attempt registers as "too slow" — the rep counter on the current
   *  item resets, but the user moves through the same item again. */
  thresholdWpm: number;
  /** Consecutive successful (correct + above-threshold) attempts
   *  required to advance to the next item. */
  repsPerItem: number;
  /** Called when the user clicks the back-to-drills affordance. */
  onExit: () => void;
};

type AttemptOutcome = "win" | "slow" | "wrong";

type State = {
  itemIdx: number;
  /** Successes accumulated on the current item (resets to 0 on
   *  miss, on slow attempt, or on advancing). */
  reps: number;
  /** What the user has typed so far in this attempt. */
  typed: string;
  /** ms timestamp of the first keystroke in this attempt. null
   *  until they start. */
  attemptStartedAt: number | null;
  /** Most recent attempt outcome — drives the brief flash that
   *  tells the user whether they advanced, slowed, or mistyped. */
  lastOutcome: AttemptOutcome | null;
  /** Score-keeping for the page footer. */
  totalAttempts: number;
  totalWins: number;
  /** Set when `reps` reaches `repsPerItem` — used to drive the
   *  "advance" flash before the reducer moves the cursor. */
  finished: boolean;
};

type Action =
  | { type: "TYPE_CHAR"; char: string; now: number; thresholdWpm: number; repsPerItem: number; itemsLength: number; targetWord: string }
  | { type: "BACKSPACE" }
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
};

/** Burst WPM for a single attempt. Standard 5-chars-per-word
 *  convention; floor the duration at 1ms to dodge division-by-zero
 *  on absurdly fast first keystrokes. */
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
    case "TYPE_CHAR": {
      if (state.finished) return state;
      const target = action.targetWord;
      const nextTyped = state.typed + action.char;
      const idx = nextTyped.length - 1;
      const expected = target[idx];
      const startedAt = state.attemptStartedAt ?? action.now;

      // Wrong char — abandon the attempt. Rep counter resets, item
      // stays the same so the user can retry. Flash "wrong" so the
      // UI can colour-feedback before the next render.
      if (expected === undefined || action.char !== expected) {
        return {
          ...state,
          typed: "",
          attemptStartedAt: null,
          reps: 0,
          lastOutcome: "wrong",
          totalAttempts: state.totalAttempts + 1,
        };
      }

      // Right char but mid-word — keep going, no outcome yet.
      if (nextTyped.length < target.length) {
        return {
          ...state,
          typed: nextTyped,
          attemptStartedAt: startedAt,
        };
      }

      // Last char correct → attempt complete. Score the burst.
      const wpm = burstWpm(target.length, action.now - startedAt);
      const fast = wpm >= action.thresholdWpm;
      if (!fast) {
        // Above-threshold miss. Counter resets but they don't lose
        // the drill — same item, retry. We don't punish slowness
        // beyond "didn't count toward the streak".
        return {
          ...state,
          typed: "",
          attemptStartedAt: null,
          reps: 0,
          lastOutcome: "slow",
          totalAttempts: state.totalAttempts + 1,
        };
      }
      const nextReps = state.reps + 1;
      const justFinishedItem = nextReps >= action.repsPerItem;
      const finishedDrill =
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
        finished: finishedDrill,
      };
    }
  }
}

export function BurstGame({
  title,
  subtitle,
  items,
  thresholdWpm,
  repsPerItem,
  onExit,
}: BurstGameProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const itemRef = useRef(items);
  itemRef.current = items;

  const targetWord = items[state.itemIdx] ?? "";

  // Brief outcome flash (200ms) so the win/slow/wrong feedback is
  // visible without lingering. The flash colour rides on lastOutcome.
  useEffect(() => {
    if (state.lastOutcome == null) return;
    const id = setTimeout(() => dispatch({ type: "RESET_FLASH" }), 350);
    return () => clearTimeout(id);
  }, [state.lastOutcome, state.itemIdx]);

  // Global keystroke listener — we don't render an <input>; the
  // surface is keyboard-driven directly. Skip when a modal owns
  // focus or another input is active (matches practice's pattern).
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
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
        dispatch({ type: "BACKSPACE" });
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
        return;
      }
      if (e.key.length === 1 && e.key !== " ") {
        e.preventDefault();
        dispatch({
          type: "TYPE_CHAR",
          char: e.key,
          now: Date.now(),
          thresholdWpm,
          repsPerItem,
          itemsLength: itemRef.current.length,
          targetWord,
        });
      }
    },
    [onExit, thresholdWpm, repsPerItem, targetWord],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const accuracy =
    state.totalAttempts > 0
      ? Math.round((state.totalWins / state.totalAttempts) * 100)
      : 100;

  return (
    <>
      <DrillHeader title={title} subtitle={subtitle} onExit={onExit} />

      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 px-5 py-10 sm:px-16">
        {state.finished ? (
          <DrillComplete
            totalWins={state.totalWins}
            totalAttempts={state.totalAttempts}
            onExit={onExit}
          />
        ) : (
          <>
            <BurstWord
              target={targetWord}
              typed={state.typed}
              outcome={state.lastOutcome}
            />

            <div className="flex flex-col items-center gap-3">
              <Tag>STREAK · {state.reps} OF {repsPerItem}</Tag>
              <StreakGrid
                total={repsPerItem}
                done={state.reps}
                active={state.reps < repsPerItem ? state.reps : null}
                cellsPerRow={repsPerItem}
                failed={state.lastOutcome === "wrong"}
                className="w-full max-w-xs"
              />
            </div>

            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <Stat label="Threshold">
                <Zap size={12} className="text-primary" /> {thresholdWpm} wpm
              </Stat>
              <Stat label="Item">
                {state.itemIdx + 1} / {items.length}
              </Stat>
              <Stat label="Accuracy">{accuracy}%</Stat>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function BurstWord({
  target,
  typed,
  outcome,
}: {
  target: string;
  typed: string;
  outcome: AttemptOutcome | null;
}) {
  return (
    <div
      className={cn(
        "select-none font-mono text-5xl font-extrabold tracking-tight transition-colors duration-200 sm:text-6xl lg:text-7xl",
        outcome === "win" && "text-primary",
        outcome === "slow" && "text-muted-foreground",
        outcome === "wrong" && "text-destructive",
      )}
      style={{ fontFamily: "var(--ft-font-family, inherit)" }}
    >
      {[...target].map((ch, i) => {
        const t = typed[i];
        const cls =
          t === undefined
            ? "text-muted-foreground/70"
            : t === ch
              ? "text-foreground"
              : "text-destructive";
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
        {children}
      </span>
    </span>
  );
}

function DrillHeader({
  title,
  subtitle,
  onExit,
}: {
  title: string;
  subtitle: string;
  onExit: () => void;
}) {
  return (
    <section className="border-b border-foreground/10 px-5 pt-8 pb-5 sm:px-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Tag>{subtitle}</Tag>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={onExit} className="gap-2">
          <ArrowLeft size={14} />
          Back to drills
        </Button>
      </div>
    </section>
  );
}

function DrillComplete({
  totalWins,
  totalAttempts,
  onExit,
}: {
  totalWins: number;
  totalAttempts: number;
  onExit: () => void;
}) {
  const accuracy =
    totalAttempts > 0 ? Math.round((totalWins / totalAttempts) * 100) : 100;
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Tag>DRILL CLEAR</Tag>
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        You cleared the run.
      </h2>
      <div className="flex items-center gap-12 text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Successful bursts
          </span>
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {totalWins}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Accuracy
          </span>
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {accuracy}%
          </span>
        </div>
      </div>
      <Button onClick={onExit} className="gap-2">
        Back to drills
      </Button>
    </div>
  );
}
