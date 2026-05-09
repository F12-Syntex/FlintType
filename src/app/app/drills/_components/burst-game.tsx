"use client";

import { ArrowLeft, Zap } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StreakGrid } from "./streak-grid";

/** A burst minigame: type each item in `items` correctly above the
 *  WPM threshold, `repsPerItem` consecutive times. Hit the rep
 *  count → advance to the next item. A wrong character or a too-slow
 *  attempt resets the rep counter on the current item.
 *
 *  Used for the burst-1000, top-100 sprint, pangram, and trigram
 *  drills — same engine, different data. */
type BurstGameProps = {
  title: string;
  subtitle: string;
  items: readonly string[];
  thresholdWpm: number;
  repsPerItem: number;
  onExit: () => void;
};

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

      if (nextTyped.length < target.length) {
        return {
          ...state,
          typed: nextTyped,
          attemptStartedAt: startedAt,
        };
      }

      const wpm = burstWpm(target.length, action.now - startedAt);
      const fast = wpm >= action.thresholdWpm;
      if (!fast) {
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
  // Whether the current item contains spaces — pangram items do, word
  // and trigram items don't. The keystroke handler honours this so
  // that hitting space on a no-space item still counts as wrong-char,
  // while space on a pangram is a real character to type.
  const itemHasSpace = targetWord.includes(" ");

  // Brief outcome flash so the win/slow/wrong feedback is visible
  // without lingering. The flash colour rides on lastOutcome.
  useEffect(() => {
    if (state.lastOutcome == null) return;
    const id = setTimeout(() => dispatch({ type: "RESET_FLASH" }), 350);
    return () => clearTimeout(id);
  }, [state.lastOutcome, state.itemIdx]);

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
      if (e.key.length === 1) {
        // Filter out plain space when the target doesn't contain
        // one — keeps the "accidental thumb-tap" tic from registering
        // as a wrong-char on every word/trigram drill. Pangram items
        // include spaces, so we let space through there.
        if (e.key === " " && !itemHasSpace) return;
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
    [onExit, thresholdWpm, repsPerItem, targetWord, itemHasSpace],
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

      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-5 py-10 sm:gap-10 sm:px-16">
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

            <BurstMeter
              typed={state.typed}
              targetLength={targetWord.length}
              attemptStartedAt={state.attemptStartedAt}
              thresholdWpm={thresholdWpm}
              outcome={state.lastOutcome}
            />

            <UpcomingPreview
              items={items}
              cursor={state.itemIdx}
            />

            <div className="flex flex-col items-center gap-3">
              <Tag>
                Streak · {state.reps} of {repsPerItem}
              </Tag>
              <StreakGrid
                total={repsPerItem}
                done={state.reps}
                active={state.reps < repsPerItem ? state.reps : null}
                cellsPerRow={repsPerItem}
                failed={state.lastOutcome === "wrong"}
                className="w-full max-w-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
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

/** The big central word. BurstType-style — large mono, untyped chars
 *  in muted, typed chars in foreground, mismatched typed chars in
 *  destructive. The whole word tints with the outcome flash on a
 *  finished attempt. */
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
        "select-none text-center font-mono font-extrabold tracking-tight transition-colors duration-200",
        // BurstType-style sizing — smaller than the headline class so
        // long pangrams still fit on a single line at sm:.
        "text-4xl sm:text-5xl lg:text-6xl",
        outcome === "win" && "text-primary",
        outcome === "slow" && "text-muted-foreground",
        outcome === "wrong" && "text-destructive",
      )}
      style={{ fontFamily: "var(--ft-font-family, inherit)" }}
    >
      {[...target].map((ch, i) => {
        const t = typed[i];
        const isCursor = i === typed.length;
        const cls =
          t === undefined
            ? "text-muted-foreground/55"
            : t === ch
              ? "text-foreground"
              : "text-destructive";
        // Render space as a bullet width so the cursor lands
        // visibly on a space within a pangram.
        const glyph = ch === " " ? " " : ch;
        return (
          <span
            key={i}
            className={cn(
              cls,
              // Subtle underline beneath the next-char so the user
              // tracks position without needing a real caret. Hidden
              // on the very last char to avoid an underline tail.
              isCursor &&
                outcome == null &&
                "border-b-2 border-primary",
            )}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
}

/** Live attempt WPM meter — fills as the user types, with a marker
 *  at the threshold. Above the line = green/primary, below = muted.
 *  This is the BurstType-style feedback that lets the user feel the
 *  rhythm: you can see whether you're tracking ahead of or behind
 *  the target without waiting for the attempt to finish. */
function BurstMeter({
  typed,
  targetLength,
  attemptStartedAt,
  thresholdWpm,
  outcome,
}: {
  typed: string;
  targetLength: number;
  attemptStartedAt: number | null;
  thresholdWpm: number;
  outcome: AttemptOutcome | null;
}) {
  // Tick a local clock so the WPM updates between keystrokes — without
  // it the meter would only refresh on each new char.
  const [, force] = useState(0);
  useEffect(() => {
    if (attemptStartedAt == null) return;
    const id = setInterval(() => force((n) => n + 1), 60);
    return () => clearInterval(id);
  }, [attemptStartedAt]);

  // The meter caps at 2× threshold so the threshold marker sits dead
  // centre — easy to read "above" vs "below". Empty attempt or
  // immediately after a finish (outcome flash) reads as 0.
  const max = thresholdWpm * 2;
  let wpm = 0;
  if (attemptStartedAt != null && typed.length > 0 && outcome == null) {
    const elapsed = Date.now() - attemptStartedAt;
    wpm = burstWpm(typed.length, elapsed);
  }
  const pct = Math.max(0, Math.min(100, (wpm / max) * 100));
  const above = wpm >= thresholdWpm;
  const progressPct = (typed.length / Math.max(1, targetLength)) * 100;

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>This burst</span>
        <span
          className={cn(
            "tabular-nums",
            wpm > 0 && (above ? "text-primary" : "text-muted-foreground"),
            outcome === "win" && "text-primary",
            outcome === "slow" && "text-muted-foreground",
            outcome === "wrong" && "text-destructive",
          )}
        >
          {Math.round(wpm)} wpm
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-sm border border-border bg-muted">
        {/* Fill bar — width tracks live wpm. Colour above/below
            threshold mirrors the win / slow outcome colours. */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 transition-[width] duration-75",
            above ? "bg-primary" : "bg-muted-foreground/60",
            outcome === "wrong" && "bg-destructive",
          )}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold marker — vertical hairline at 50 % of the bar
            (since max = threshold × 2). */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-foreground/30"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/40"
        />
      </div>
      {/* Word completion bar — tracks how far through the current
          attempt the user is. Sits below the WPM bar so the two
          dimensions read independently: cadence (above) and
          progress (below). */}
      <div className="relative h-1 w-full overflow-hidden rounded-sm bg-muted">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-foreground/40 transition-[width] duration-75"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

/** Up to three queued items rendered as a tight mono strip — the
 *  active item, then the next two dimmed. Lets the user see what's
 *  coming and pace their breath. Hidden on the last item. */
function UpcomingPreview({
  items,
  cursor,
}: {
  items: readonly string[];
  cursor: number;
}) {
  const next = items.slice(cursor + 1, cursor + 3);
  if (next.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        Up next
      </span>
      <div className="flex max-w-[80vw] flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-sm text-muted-foreground/55 sm:text-base">
        {next.map((it, i) => (
          <span
            key={`${cursor}-${i}-${it}`}
            className="truncate whitespace-nowrap"
            style={{ fontFamily: "var(--ft-font-family, inherit)" }}
          >
            {it}
          </span>
        ))}
      </div>
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
    <section className="border-b border-border px-5 pt-8 pb-5 sm:px-16">
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
      <Tag>Drill clear</Tag>
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
