"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Tag } from "@/components/ft";
import { useCaretSettings, type CaretStyle } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import { DrillHeader } from "./drill-header";

/** A burst minigame: type each item in `items` correctly above the
 *  WPM threshold, `repsPerItem` consecutive times. Hit the rep
 *  count → advance to the next item. A wrong character or a too-slow
 *  attempt resets the rep counter on the current item.
 *
 *  Used for the burst-1000, top-100 sprint, pangram, and trigram
 *  drills — same engine, different data. The surface mounts at
 *  `/drills/<id>` and exits via the breadcrumb back-link in
 *  the shared DrillHeader, not via Esc or an in-page button. */
type BurstSurfaceProps = {
  title: string;
  subtitle: string;
  items: readonly string[];
  thresholdWpm: number;
  repsPerItem: number;
  /** Optional bottom slot rendered below the streak block — used by
   *  burst-1000 to show its 1000-cell discovery grid. Other drills
   *  pass null and get a clean centred surface. */
  progressSlot?: ReactNode;
  /** Fired the moment a successful CONFIRM advances past an item.
   *  Burst-1000 uses this to record the cleared word against the
   *  user's persisted discovered set. */
  onItemCleared?: (word: string) => void;
  /** Override label for the "Item" stat card top value — the burst-
   *  1000 wrapper passes "X/1000" while the spec-driven runs use the
   *  default "X/Y session" form. */
  itemStat?: { top: string; caption: string };
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
    case "BACKSPACE_WORD":
      // Ctrl/Alt/⌘+Backspace — wipe the entire current attempt in
      // one keystroke. Burst items are short single words so
      // "delete word" is effectively "clear", which is what the
      // user wants when they realise the attempt is botched.
      if (state.typed.length === 0) return state;
      return { ...state, typed: "", attemptStartedAt: null };
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

export function BurstSurface({
  title,
  subtitle,
  items,
  thresholdWpm,
  repsPerItem,
  progressSlot,
  onItemCleared,
  itemStat,
}: BurstSurfaceProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const itemRef = useRef(items);
  itemRef.current = items;

  // Watch the item cursor: every time it advances we know the previous
  // item was cleared (burst engine only steps the cursor on a win that
  // hits repsPerItem). Fire the parent callback with the word that was
  // just cleared so trackers can persist it.
  const lastClearedIdxRef = useRef(-1);
  useEffect(() => {
    if (!onItemCleared) return;
    if (state.itemIdx === 0) return;
    const cleared = state.itemIdx - 1;
    if (cleared <= lastClearedIdxRef.current) return;
    lastClearedIdxRef.current = cleared;
    const word = itemRef.current[cleared];
    if (word) onItemCleared(word);
  }, [state.itemIdx, onItemCleared]);

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
      // Only Backspace is allowed to carry a modifier (Ctrl /
      // Alt(Win) / ⌥(Mac) / ⌘(Mac) + Backspace = "delete word").
      // Other modified shortcuts (Ctrl+R, Cmd+T, …) fall through to
      // the browser unchanged.
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
      // Esc is intentionally not bound — accidental taps mid-burst
      // shouldn't drop the user out of the drill. The breadcrumb
      // back-link is the documented exit affordance.
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
      <DrillHeader title={title} subtitle={subtitle} />

      {state.finished ? (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-10 sm:px-16">
          <DrillComplete
            totalWins={state.totalWins}
            totalAttempts={state.totalAttempts}
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
              top={itemStat?.top ?? `${state.itemIdx + 1}/${items.length}`}
              caption={itemStat?.caption ?? "Item"}
            />
            <StatCard top={`${accuracy}%`} caption="Accuracy" />
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

          {/* Optional bottom slot — burst-1000 fills it with its
           *  long-running discovery grid. Other drills leave it null
           *  and the surface stays focused on the central word + the
           *  streak pips above. */}
          {progressSlot}
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
        "flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-center sm:min-w-[80px] sm:py-2.5",
        accent === "muted" && "border-dashed",
      )}
    >
      <span
        className={cn(
          "font-mono text-[13px] font-bold leading-none tabular-nums sm:text-[15px]",
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


/** The big central word. Untyped chars paint with the practice
 *  passage's untyped colour, typed chars with the typed colour,
 *  mistyped with the error colour - same CSS variables the practice
 *  surface uses so a colour pick on the customise page propagates
 *  here. The word as a whole tints to the outcome on a finished
 *  attempt; while `ready` (waiting for space-to-commit) the whole
 *  block pulses primary.
 *
 *  Long pangrams wrap to as many lines as needed; the size scales
 *  down on narrow viewports so even an eight-word sentence fits at
 *  375 px without horizontal scroll.
 *
 *  The user's caret style / width / radius / blink speed all apply,
 *  via an absolutely-positioned <CaretGlyph> measured against the
 *  next-to-type char. */
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
  const { settings: caret } = useCaretSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [caretRect, setCaretRect] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || caret.style === 'off') {
      setCaretRect(null);
      return;
    }
    const cursorIdx =
      typed.length < target.length ? typed.length : target.length - 1;
    const charEl = el.querySelectorAll<HTMLSpanElement>('[data-char]')[cursorIdx];
    if (!charEl) {
      setCaretRect(null);
      return;
    }
    const wrap = el.getBoundingClientRect();
    const r = charEl.getBoundingClientRect();
    setCaretRect({
      left: r.left - wrap.left,
      top: r.top - wrap.top,
      w: r.width,
      h: r.height,
    });
  }, [typed.length, target, caret.style]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative max-w-full select-none break-words text-center font-mono font-extrabold tracking-tight transition-colors duration-200',
        'text-balance text-3xl leading-tight sm:text-4xl lg:text-5xl',
        outcome === 'win' && 'text-primary',
        outcome === 'slow' && 'text-muted-foreground',
        outcome === 'wrong' && 'text-destructive',
        ready && outcome == null && 'text-primary motion-safe:animate-pulse',
      )}
      style={{ fontFamily: 'var(--ft-font-family, inherit)' }}
    >
      {[...target].map((ch, i) => {
        const t = typed[i];
        let color: string;
        if (t === undefined) {
          color = 'var(--ft-passage-untyped, var(--muted-foreground))';
        } else if (t === ch) {
          color = 'var(--ft-passage-typed, var(--foreground))';
        } else {
          color = 'var(--ft-passage-error, var(--destructive))';
        }
        const isCursor = i === typed.length;
        const blockOnActive =
          caret.style === 'block' && isCursor && outcome == null;
        return (
          <span
            key={i}
            data-char
            style={
              blockOnActive
                ? {
                    color,
                    backgroundColor:
                      'color-mix(in oklch, var(--primary) 35%, transparent)',
                    borderRadius: caret.radius,
                  }
                : { color }
            }
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
      {caretRect && caret.style !== 'off' && outcome == null ? (
        <CaretGlyph
          rect={caretRect}
          style={caret.style}
          width={caret.width}
          radius={caret.radius}
          blinkSpeed={caret.blinkSpeed}
          atEnd={typed.length >= target.length}
        />
      ) : null}
    </div>
  );
}

/** Static-position caret painted absolutely over the active char.
 *  Mirrors the practice CaretShape: line / underline / outline. The
 *  block style is drawn inline by the parent (it tints the char's
 *  background directly so the letter remains readable on top of the
 *  highlight). */
function CaretGlyph({
  rect,
  style,
  width,
  radius,
  blinkSpeed,
  atEnd,
}: {
  rect: { left: number; top: number; w: number; h: number };
  style: CaretStyle;
  width: number;
  radius: number;
  blinkSpeed: number;
  atEnd: boolean;
}) {
  if (style === 'off' || style === 'block') return null;
  const blinkClass = blinkSpeed > 0 ? 'ft-caret-blink' : '';
  const blinkVar = {
    ['--ft-blink-speed' as string]: `${blinkSpeed}ms`,
  } as React.CSSProperties;
  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundColor: 'var(--primary)',
    borderRadius: radius,
    ...blinkVar,
  };
  if (style === 'line') {
    const left = atEnd ? rect.left + rect.w : rect.left;
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...base,
          left,
          top: rect.top + (rect.h - rect.h * 0.85) / 2,
          width,
          height: rect.h * 0.85,
        }}
      />
    );
  }
  if (style === 'underline') {
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...base,
          left: rect.left,
          top: rect.top + rect.h - width,
          width: rect.w,
          height: width,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={blinkClass}
      style={{
        ...base,
        left: rect.left,
        top: rect.top,
        width: rect.w,
        height: rect.h,
        backgroundColor: 'transparent',
        border: `${width}px solid var(--primary)`,
      }}
    />
  );
}

function DrillComplete({
  totalWins,
  totalAttempts,
}: {
  totalWins: number;
  totalAttempts: number;
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
      <Link
        href="/drills"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to drills
      </Link>
    </div>
  );
}
