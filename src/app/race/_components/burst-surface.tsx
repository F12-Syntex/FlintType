"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useCaretSettings, type CaretStyle } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import { RACE_MODES } from "./race-data";
import { RacePlayerStrip } from "./player-strip";
import { useRace } from "./race-state";

/** Burst-race surface. Multiplayer version of the burst minigame:
 *  each racer cycles through `items` words, having to land
 *  `repsPerItem` consecutive bursts above `thresholdWpm` on the
 *  current item before advancing to the next. First to clear all
 *  items wins.
 *
 *  This component owns the user's local typing state and dispatches
 *  USER_BURST_COMMIT into the race reducer on every committed
 *  attempt. Bots are advanced by the race-state TICK loop (their
 *  reps accumulate at a rate tied to their target WPM).
 *
 *  Why a separate surface and not `<RacePassage>`: burst typing has
 *  totally different rules from passage typing — space-confirms
 *  rather than space-advances, threshold WPM gate, rep streaks.
 *  Forcing this through practice-state would have meant inverting
 *  half its reducer; a parallel surface keeps both flows clean. */

type AttemptOutcome = "win" | "slow" | "wrong";

type LocalState = {
  typed: string;
  attemptStartedAt: number | null;
  lastOutcome: AttemptOutcome | null;
  lastWpm: number | null;
};

const initialLocal: LocalState = {
  typed: "",
  attemptStartedAt: null,
  lastOutcome: null,
  lastWpm: null,
};

type LocalAction =
  | { type: "TYPE_CHAR"; char: string; now: number; targetWord: string }
  | { type: "BACKSPACE" }
  | { type: "RESET_FLASH" }
  | {
      type: "COMMIT";
      success: boolean;
      outcome: AttemptOutcome;
      wpm: number | null;
    };

function localReducer(s: LocalState, a: LocalAction): LocalState {
  switch (a.type) {
    case "RESET_FLASH":
      return { ...s, lastOutcome: null };
    case "BACKSPACE":
      if (s.typed.length === 0) return s;
      return { ...s, typed: s.typed.slice(0, -1) };
    case "TYPE_CHAR": {
      const target = a.targetWord;
      const nextTyped = s.typed + a.char;
      const idx = nextTyped.length - 1;
      const expected = target[idx];
      if (expected === undefined || a.char !== expected) {
        return {
          typed: "",
          attemptStartedAt: null,
          lastOutcome: "wrong",
          lastWpm: s.lastWpm,
        };
      }
      return {
        ...s,
        typed: nextTyped,
        attemptStartedAt: s.attemptStartedAt ?? a.now,
      };
    }
    case "COMMIT":
      return {
        typed: "",
        attemptStartedAt: null,
        lastOutcome: a.outcome,
        lastWpm: a.wpm ?? s.lastWpm,
      };
  }
}

function burstWpm(charCount: number, durationMs: number): number {
  const ms = Math.max(1, durationMs);
  return (charCount / 5) * (60_000 / ms);
}

export function BurstRaceSurface() {
  const { state, dispatch, countdownNumber } = useRace();
  const mode = RACE_MODES[state.modeId];
  const burst = mode.burst;
  const [local, localDispatch] = useReducer(localReducer, initialLocal);

  const you = state.racers.find((r) => r.isYou)!;
  const itemIdx = you.burstItemIdx ?? 0;
  const reps = you.burstReps ?? 0;
  const targetWord =
    burst && itemIdx < burst.items.length ? burst.items[itemIdx]! : "";

  // Brief outcome flash so the user gets visible feedback without it
  // lingering longer than the next keystroke.
  useEffect(() => {
    if (local.lastOutcome == null) return;
    const id = setTimeout(() => localDispatch({ type: "RESET_FLASH" }), 350);
    return () => clearTimeout(id);
  }, [local.lastOutcome, itemIdx]);

  // The "ready to commit" state: typed exactly equals the target,
  // attempt was timed, and no outcome flash is still up. Used for
  // visual pulsing + to gate the space-commit branch below.
  const ready =
    burst != null &&
    local.typed.length === targetWord.length &&
    local.typed === targetWord &&
    local.attemptStartedAt != null &&
    local.lastOutcome == null;

  // Window keydown handler. Mirrors the standalone BurstSurface but
  // gates everything on the race being in `racing` phase — outside
  // racing we let the race-state's own keydown swallow input.
  const stateRef = useRef({ local, targetWord, itemIdx });
  stateRef.current = { local, targetWord, itemIdx };
  const phase = state.phase;
  const finished = you.finishedAt != null;
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== "racing") return;
      if (finished) return;
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
        e.stopPropagation();
        localDispatch({ type: "BACKSPACE" });
        return;
      }
      if (e.key.length !== 1) return;
      const cur = stateRef.current;
      if (e.key === " ") {
        // Commit on space when the user has the whole word typed.
        if (
          cur.local.typed.length === cur.targetWord.length &&
          cur.local.typed === cur.targetWord &&
          cur.local.attemptStartedAt != null
        ) {
          e.preventDefault();
          e.stopPropagation();
          const wpm = burstWpm(
            cur.targetWord.length,
            Date.now() - cur.local.attemptStartedAt,
          );
          const wpmRounded = Math.round(wpm);
          const success = burst != null && wpm >= burst.thresholdWpm;
          localDispatch({
            type: "COMMIT",
            success,
            outcome: success ? "win" : "slow",
            wpm: wpmRounded,
          });
          dispatch({
            type: "USER_BURST_COMMIT",
            now: Date.now(),
            success,
            wpm: wpmRounded,
          });
          return;
        }
        // Mid-attempt space — swallow so an early thumb-tap doesn't
        // register as a wrong char.
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      // Detect a mistype *before* dispatching so we can also reset
      // the racer's burst reps in race state — burst's defining rule
      // is that a wrong key kills the streak, and the race-level
      // bookkeeping has to mirror the local UI's wrong-flash.
      const idx = cur.local.typed.length;
      const expected = cur.targetWord[idx];
      const isMistype = expected === undefined || e.key !== expected;
      localDispatch({
        type: "TYPE_CHAR",
        char: e.key,
        now: Date.now(),
        targetWord: cur.targetWord,
      });
      if (isMistype) {
        dispatch({
          type: "USER_BURST_COMMIT",
          now: Date.now(),
          success: false,
          wpm: 0,
        });
      }
    },
    [phase, finished, burst, dispatch],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  if (!burst) return null;
  const itemsCount = burst.items.length;
  const wpm = you.wpm;
  const phaseWord =
    state.phase === "lobby"
      ? "READY"
      : state.phase === "countdown"
        ? "STARTING"
        : state.phase === "finished"
          ? "FINISHED"
          : "LIVE";
  const showStripLive =
    state.phase === "racing" ||
    state.phase === "finished" ||
    state.phase === "countdown";
  return (
    <>
      <div className="hidden flex-wrap items-baseline justify-between gap-x-8 gap-y-1 md:flex">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ITEM {Math.min(itemIdx + 1, itemsCount)}/{itemsCount}
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-primary tabular-nums">WPM {wpm}</span>
          <span className="tabular-nums">GATE {burst.thresholdWpm}</span>
          <span>{phaseWord}</span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
          <BurstWord
            target={targetWord}
            typed={local.typed}
            outcome={local.lastOutcome}
            ready={ready}
          />
          <StreakPips
            total={burst.repsPerItem}
            done={reps}
            failed={local.lastOutcome === "wrong"}
          />
          <StatusBlock
            ready={ready}
            outcome={local.lastOutcome}
            lastWpm={local.lastWpm}
            thresholdWpm={burst.thresholdWpm}
          />
        </div>

        {showStripLive ? (
          <RacePlayerStrip
            racers={state.racers}
            totalChars={state.totalChars}
          />
        ) : null}

        {state.phase === "countdown" && countdownNumber != null ? (
          <CountdownOverlay n={countdownNumber} />
        ) : null}
        {state.phase === "queue" ? <QueueOverlay /> : null}
      {state.phase === "matching" ? <MatchingOverlay /> : null}
        {state.phase === "lobby" ? <LobbyOverlay /> : null}
      </div>
    </>
  );
}

/* ─── Big central word + caret ──────────────────────────────────── */

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
    if (!el || caret.style === "off") {
      setCaretRect(null);
      return;
    }
    const cursorIdx =
      typed.length < target.length ? typed.length : target.length - 1;
    const charEl = el.querySelectorAll<HTMLSpanElement>("[data-char]")[cursorIdx];
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
        "relative max-w-full select-none break-words text-center font-mono font-extrabold tracking-tight transition-colors duration-200",
        "text-balance text-4xl leading-tight sm:text-5xl lg:text-6xl",
        outcome === "win" && "text-primary",
        outcome === "slow" && "text-muted-foreground",
        outcome === "wrong" && "text-destructive",
        ready && outcome == null && "text-primary motion-safe:animate-pulse",
      )}
      style={{ fontFamily: "var(--ft-font-family, inherit)" }}
    >
      {[...target].map((ch, i) => {
        const t = typed[i];
        let color: string;
        if (t === undefined) {
          color = "var(--ft-passage-untyped, var(--muted-foreground))";
        } else if (t === ch) {
          color = "var(--ft-passage-typed, var(--foreground))";
        } else {
          color = "var(--ft-passage-error, var(--destructive))";
        }
        const isCursor = i === typed.length;
        const blockOnActive =
          caret.style === "block" && isCursor && outcome == null;
        return (
          <span
            key={i}
            data-char
            style={
              blockOnActive
                ? {
                    color,
                    backgroundColor:
                      "color-mix(in oklch, var(--primary) 35%, transparent)",
                    borderRadius: caret.radius,
                  }
                : { color }
            }
          >
            {ch}
          </span>
        );
      })}
      {caretRect && caret.style !== "off" && outcome == null ? (
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
  if (style === "off" || style === "block") return null;
  const blinkClass = blinkSpeed > 0 ? "ft-caret-blink" : "";
  const blinkVar = {
    ["--ft-blink-speed" as string]: `${blinkSpeed}ms`,
  } as React.CSSProperties;
  const base: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    backgroundColor: "var(--primary)",
    borderRadius: radius,
    ...blinkVar,
  };
  if (style === "line") {
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
  if (style === "underline") {
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
        backgroundColor: "transparent",
        border: `${width}px solid var(--primary)`,
      }}
    />
  );
}

/* ─── streak pips + status block ────────────────────────────────── */

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
              "h-1.5 w-8 rounded-sm transition-colors",
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

/* ─── Phase overlays (shared shape with RacePassage) ────────────── */

function QueueOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md bg-card/85 backdrop-blur-sm">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Press Find race to queue up
      </span>
      <span className="mt-2 max-w-md px-6 text-center text-[12.5px] text-muted-foreground/85">
        Bots only enter the lobby once you queue — you race when you're ready.
      </span>
    </div>
  );
}

function MatchingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md bg-card/85 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Finding racers
        </span>
      </div>
      <span className="mt-2 max-w-md px-6 text-center text-[12.5px] text-muted-foreground/85">
        Pairing you with opponents at your level. Hold tight.
      </span>
    </div>
  );
}

function CountdownOverlay({ n }: { n: number }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md",
        "bg-card/90 backdrop-blur-sm",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Starting in
      </span>
      <span className="font-mono text-7xl font-extrabold tabular-nums text-primary sm:text-8xl">
        {n === 0 ? "GO" : n}
      </span>
    </div>
  );
}

function LobbyOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md bg-card/85 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Lobby full · countdown starting
        </span>
      </div>
      <span className="mt-2 max-w-md px-6 text-center text-[12.5px] text-muted-foreground/85">
        Type each word, then space to commit. Land it above the gate WPM
        for the burst to count.
      </span>
    </div>
  );
}

