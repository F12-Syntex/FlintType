"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  /** Most recently committed attempt's WPM. Surfaced under the
   *  central word as "Last WPM score: N" so the user can feel the
   *  pace of their bursts without a live meter cluttering the
   *  surface. Null until the first commit. */
  lastWpm: number | null;
};

type Action =
  | { type: "TYPE_CHAR"; char: string; now: number; targetWord: string }
  | { type: "CONFIRM"; now: number; thresholdWpm: number; repsPerItem: number; itemsLength: number; targetWord: string }
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
  lastWpm: null,
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

      // Past-the-end characters (typed === target already) and any
      // mismatch reset the rep with a wrong-char outcome. The space
      // confirm key is filtered before this dispatch — it never lands
      // here in non-pangram items, and in pangrams a trailing space is
      // already accounted for inside the target.
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

      // Mid-attempt typing — accept the char and keep going. The
      // attempt is not finalised until the user explicitly presses
      // space (CONFIRM) so the timing reflects the natural type-then-
      // space cadence the user already has from real typing.
      return {
        ...state,
        typed: nextTyped,
        attemptStartedAt: startedAt,
      };
    }
    case "CONFIRM": {
      if (state.finished) return state;
      const target = action.targetWord;
      // Confirming before the word is finished, or before any
      // keystroke has happened — neutral no-op. The visible UI never
      // lights the "ready" state until typed is complete and clean,
      // so this branch only catches stray spaces from impatient
      // fingers.
      if (state.typed.length !== target.length) return state;
      if (state.typed !== target) return state;
      if (state.attemptStartedAt == null) return state;

      const wpm = burstWpm(target.length, action.now - state.attemptStartedAt);
      const wpmRounded = Math.round(wpm);
      const fast = wpm >= action.thresholdWpm;
      if (!fast) {
        return {
          ...state,
          typed: "",
          attemptStartedAt: null,
          reps: 0,
          lastOutcome: "slow",
          totalAttempts: state.totalAttempts + 1,
          lastWpm: wpmRounded,
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
        lastWpm: wpmRounded,
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
  // True the moment the user has typed the whole target correctly —
  // they then press space to commit the burst. Until they do, the
  // attempt is "ready" but uncommitted: backspace returns to typing,
  // a stray non-space key resets it. Mirrors the natural type-then-
  // space cadence everyone already has from real typing.
  const ready =
    state.typed.length === targetWord.length &&
    state.typed === targetWord &&
    state.attemptStartedAt != null &&
    state.lastOutcome == null;

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
        // Space is the burst-commit key. Once the user has typed the
        // whole target (state.typed === targetWord), pressing space
        // confirms the attempt — that's where the final WPM is
        // computed, and where the win / slow branch is decided. Any
        // earlier space is part of the target text (only legal on
        // pangram items, where the target genuinely has spaces) or
        // an accidental tap (filtered for word/trigram items so the
        // streak isn't lost to a thumb tic).
        if (e.key === " ") {
          if (
            state.typed.length === targetWord.length &&
            state.typed === targetWord &&
            state.attemptStartedAt != null
          ) {
            e.preventDefault();
            dispatch({
              type: "CONFIRM",
              now: Date.now(),
              thresholdWpm,
              repsPerItem,
              itemsLength: itemRef.current.length,
              targetWord,
            });
            return;
          }
          // Mid-attempt: only legal as a real character in pangrams.
          // Outside pangrams it's the accidental-thumb-tap case —
          // swallow rather than count as a wrong-char miss.
          if (!targetWord.slice(state.typed.length).startsWith(" ")) return;
        }
        e.preventDefault();
        dispatch({
          type: "TYPE_CHAR",
          char: e.key,
          now: Date.now(),
          targetWord,
        });
      }
    },
    [
      onExit,
      thresholdWpm,
      repsPerItem,
      targetWord,
      state.typed,
      state.attemptStartedAt,
    ],
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

      {state.finished ? (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-10 sm:px-16">
          <DrillComplete
            totalWins={state.totalWins}
            totalAttempts={state.totalAttempts}
            onExit={onExit}
          />
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col items-stretch gap-8 px-5 py-8 sm:gap-12 sm:px-12 lg:px-20">
          {/* Top bracketed stat strip — the four most useful counters
           *  at a glance. The bracket frame mirrors the editorial
           *  flourish on the customise page; the strip is centred so
           *  it visually anchors the surface above the central word. */}
          <StatStripFrame label="Burst">
            <StatCard top={String(thresholdWpm)} caption="Threshold" />
            <StatCard top={String(state.reps)} caption="Streak" />
            <StatCard
              top={`${state.itemIdx + 1}/${items.length}`}
              caption="Item"
            />
            <StatCard top={`${accuracy}%`} caption="Accuracy" />
            <StatCard
              top="Esc"
              caption="Exit"
              accent="muted"
            />
          </StatStripFrame>

          {/* Central word + streak pips + status text. Vertically
           *  spaced apart so the eye lands on the word first, then
           *  drops to the status block. */}
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <BurstWord
              target={targetWord}
              typed={state.typed}
              outcome={state.lastOutcome}
              ready={ready}
            />

            <StreakPips
              total={repsPerItem}
              done={state.reps}
              failed={state.lastOutcome === "wrong"}
            />

            <StatusBlock
              ready={ready}
              outcome={state.lastOutcome}
              lastWpm={state.lastWpm}
              thresholdWpm={thresholdWpm}
            />
          </div>

          {/* Bottom bracketed progress strip — one cell per item, lit
           *  when that item has been cleared. Mirrors the screenshot's
           *  "WORDS DISCOVERED (46/1000)" pattern; gives the user a
           *  tangible sense of how much of the drill remains. */}
          <ProgressStripFrame
            cleared={state.itemIdx}
            total={items.length}
            currentReps={state.reps}
            repsPerItem={repsPerItem}
          />
        </section>
      )}
    </>
  );
}

// ─── stat strip ────────────────────────────────────────────────────

function StatStripFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3">
        {children}
      </div>
      {/* Bracket beneath the cards — two hairlines flanking a centred
       *  label. The label sits in a `bg-background` chip so it eats
       *  the line behind it for the editorial-mechanical bracket look. */}
      <div
        aria-hidden
        className="relative mt-2 flex items-center justify-center"
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <span className="relative bg-background px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

function StatCard({
  top,
  caption,
  accent = "default",
}: {
  /** Big glyph at the top of the card — number, hotkey letter, or
   *  short token like "12/30". Rendered in mono. */
  top: string;
  /** Small uppercase caption below the glyph. */
  caption: string;
  /** `default` is foreground on card; `muted` is dimmer chrome for the
   *  Esc/Exit affordance so it doesn't pull the eye like a real metric. */
  accent?: "default" | "muted";
}) {
  return (
    <div
      className={cn(
        "flex w-[64px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-2 text-center sm:w-[72px] sm:py-3",
        accent === "muted" && "border-dashed",
      )}
    >
      <span
        className={cn(
          "font-mono text-base font-bold leading-none tabular-nums sm:text-lg",
          accent === "default" ? "text-foreground" : "text-muted-foreground",
        )}
        style={{ fontFamily: "var(--ft-font-family, inherit)" }}
      >
        {top}
      </span>
      <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
        {caption}
      </span>
    </div>
  );
}

// ─── streak pips ───────────────────────────────────────────────────

function StreakPips({
  total,
  done,
  failed,
}: {
  total: number;
  done: number;
  failed: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => {
        const filled = i < done;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "h-1.5 w-7 rounded-sm transition-colors",
              filled
                ? failed
                  ? "bg-destructive/70"
                  : "bg-primary"
                : "bg-foreground/15",
            )}
          />
        );
      })}
    </div>
  );
}

// ─── status block ──────────────────────────────────────────────────

function StatusBlock({
  ready,
  outcome,
  lastWpm,
  thresholdWpm,
}: {
  ready: boolean;
  outcome: AttemptOutcome | null;
  lastWpm: number | null;
  thresholdWpm: number;
}) {
  // Top line — "Ready / Slow / Miss / Type" — picks one mode per
  // state combination. Bottom line surfaces the last burst's WPM if
  // we have one, otherwise stays blank-but-reserved so the layout
  // doesn't jump on first commit.
  let label: string;
  let labelTone: "primary" | "destructive" | "muted" | "foreground";
  if (outcome === "win") {
    label = "Hit";
    labelTone = "primary";
  } else if (outcome === "slow") {
    label = "Slow";
    labelTone = "muted";
  } else if (outcome === "wrong") {
    label = "Miss";
    labelTone = "destructive";
  } else if (ready) {
    label = "Ready";
    labelTone = "primary";
  } else {
    label = "Type";
    labelTone = "foreground";
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "font-mono text-base font-bold tracking-tight sm:text-lg",
          labelTone === "primary" && "text-primary motion-safe:animate-pulse",
          labelTone === "destructive" && "text-destructive",
          labelTone === "muted" && "text-muted-foreground",
          labelTone === "foreground" && "text-foreground",
        )}
        style={{ fontFamily: "var(--ft-font-family, inherit)" }}
      >
        {label}
      </span>
      <span className="h-4 text-xs text-muted-foreground tabular-nums">
        {lastWpm != null ? (
          <>
            Last burst:{" "}
            <span
              className={cn(
                "font-semibold",
                lastWpm >= thresholdWpm ? "text-primary" : "text-foreground",
              )}
            >
              {lastWpm} wpm
            </span>
          </>
        ) : (
          <span aria-hidden>&nbsp;</span>
        )}
      </span>
    </div>
  );
}

// ─── progress strip ────────────────────────────────────────────────

function ProgressStripFrame({
  cleared,
  total,
  currentReps,
  repsPerItem,
}: {
  /** Items fully cleared so far. */
  cleared: number;
  /** Total items in the drill. */
  total: number;
  /** Reps clocked on the in-flight item — drives a half-lit cell so
   *  the user sees fractional progress within the current item. */
  currentReps: number;
  repsPerItem: number;
}) {
  // Cells render with three intensities:
  //   cleared       — fully lit primary
  //   in-progress   — partial alpha that scales with currentReps
  //   pending       — dim hairline
  // The progress strip can run wide; on narrow viewports it wraps
  // gracefully because each cell is a fixed-min-width flex child.
  const cells = Array.from({ length: total });
  const partialAlpha =
    repsPerItem > 0 ? Math.min(1, currentReps / repsPerItem) : 0;
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="rounded-md border border-border bg-card/40 p-3 sm:p-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={cleared}
          className="flex flex-wrap gap-1"
        >
          {cells.map((_, i) => {
            const state =
              i < cleared
                ? "cleared"
                : i === cleared
                  ? "active"
                  : "pending";
            return (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "h-2 min-w-[10px] flex-1 rounded-sm transition-colors",
                  state === "cleared" && "bg-primary",
                  state === "pending" && "bg-foreground/10",
                )}
                style={
                  state === "active"
                    ? {
                        backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(
                          partialAlpha * 80 + 10,
                        )}%, transparent)`,
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
      <div
        aria-hidden
        className="relative mt-2 flex items-center justify-center"
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <span className="relative bg-background px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
          Items cleared · {cleared}/{total}
        </span>
      </div>
    </div>
  );
}

/** The big central word. BurstType-style — large mono, untyped chars
 *  in muted, typed chars in foreground, mismatched typed chars in
 *  destructive. The whole word tints with the outcome flash on a
 *  finished attempt. When `ready`, the trailing edge of the word
 *  pulses to telegraph the "press space" gate. */
function BurstWord({
  target,
  typed,
  outcome,
  ready,
}: {
  target: string;
  typed: string;
  outcome: AttemptOutcome | null;
  ready: boolean;
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
        ready && outcome == null && "text-primary motion-safe:animate-pulse",
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
