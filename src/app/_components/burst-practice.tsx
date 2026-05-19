"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { resolveBurstThreshold } from "@/lib/avg-wpm-cache";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { useLifetimeStats } from "@/lib/use-lifetime-stats";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

/** Same per-letter colour tokens the Passage uses. Re-declared here
 *  rather than imported so this file stays standalone — there's no
 *  drift risk because both surfaces read the same CSS variables.
 *  When the appearance / colour-picker UI updates `--ft-passage-*`,
 *  BURST and WORDS pick up the change identically. */
const TYPED_TEXT = "text-[var(--ft-passage-typed,var(--primary))]";
const UNTYPED_TEXT =
  "text-[var(--ft-passage-untyped,var(--muted-foreground))]";
const ERROR_TEXT = "text-[var(--ft-passage-error,var(--destructive))]";

/** BURST mode surface.
 *
 *  Replaces Passage entirely when mode === BURST. Renders the
 *  *current* word centred + large, the way the drills page bursts
 *  feel — but pulls every visual through the practice settings
 *  (font family, font scale, mistake style, blind mode, caret
 *  colour token) so customisation flows through 1:1.
 *
 *  Behaviour layer (same as before):
 *    - TYPE_CHAR + BACKSPACE flow through the standard reducer.
 *    - SPACE is intercepted here. Computes attempt WPM, decides
 *      advance vs retry against threshold + reps.
 *    - Natural `phase=done` on the final rep grants
 *      `XP_PER_DRILL` via lifetimeStats.drillsCompleted. */
export function BurstPractice() {
  const { state, dispatch } = usePractice();
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const { settings: caret } = useCaretSettings();
  const { incrementDrillsCompleted } = useLifetimeStats();

  const thresholdWpm = useMemo(
    () => resolveBurstThreshold(behaviour.burstThreshold),
    [behaviour.burstThreshold],
  );
  const repsPerItem = Math.max(1, appearance.burstReps);

  const attemptStartRef = useRef<number | null>(null);
  const prevTypedLenRef = useRef(0);
  const [reps, setReps] = useState(0);
  const repsRef = useRef(reps);
  repsRef.current = reps;
  const [lastWpm, setLastWpm] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"win" | "slow" | "wrong" | null>(
    null,
  );

  const cursorWord = state.cursorWord;
  const typedHere = state.typed[cursorWord] ?? "";
  const target = state.words[cursorWord] ?? "";

  // Track attempt start on the 0→1 typed-length transition. Drops back
  // to null on a BURST_RESET (typed → "").
  useEffect(() => {
    const len = typedHere.length;
    if (len === 1 && prevTypedLenRef.current === 0) {
      attemptStartRef.current = Date.now();
    } else if (len === 0) {
      attemptStartRef.current = null;
    }
    prevTypedLenRef.current = len;
  }, [typedHere]);

  useEffect(() => {
    setReps(0);
  }, [cursorWord]);

  useEffect(() => {
    setReps(0);
    setOutcome(null);
    setLastWpm(null);
    attemptStartRef.current = null;
    prevTypedLenRef.current = 0;
  }, [state.words]);

  const handleSpace = useCallback(() => {
    if (state.phase === "done" || state.phase === "rest") return;
    const tgt = state.words[state.cursorWord] ?? "";
    const typed = state.typed[state.cursorWord] ?? "";
    if (typed !== tgt) {
      setOutcome("wrong");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    const startedAt = attemptStartRef.current;
    const now = Date.now();
    if (startedAt == null) {
      setOutcome("slow");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    const charCount = tgt.length;
    const ms = Math.max(1, now - startedAt);
    const wpm = (charCount / 5) * (60_000 / ms);
    const wpmRounded = Math.round(wpm);
    setLastWpm(wpmRounded);
    if (wpm < thresholdWpm) {
      setOutcome("slow");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    setOutcome("win");
    const nextReps = repsRef.current + 1;
    if (nextReps < repsPerItem) {
      setReps(nextReps);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    setReps(0);
    dispatch({ type: "SPACE", now, strictSpace: false });
  }, [
    state.phase,
    state.cursorWord,
    state.typed,
    state.words,
    thresholdWpm,
    repsPerItem,
    dispatch,
  ]);

  useEffect(() => {
    if (outcome == null) return;
    const id = setTimeout(() => setOutcome(null), 400);
    return () => clearTimeout(id);
  }, [outcome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "TEXTAREA" || active.tagName === "SELECT")
      ) {
        return;
      }
      e.preventDefault();
      handleSpace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSpace]);

  const grantedRef = useRef(false);
  useEffect(() => {
    if (state.phase !== "done") {
      grantedRef.current = false;
      return;
    }
    if (grantedRef.current) return;
    grantedRef.current = true;
    incrementDrillsCompleted();
  }, [state.phase, incrementDrillsCompleted]);

  const itemsLength = state.words.length;
  const progress = `${Math.min(state.cursorWord, itemsLength)}/${itemsLength}`;
  const repStr = `${reps}/${repsPerItem}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 sm:gap-14">
      {/* Status strip — eyebrow + value pairs, same tracking / weight
       *  as the live readouts so it reads as part of the practice
       *  chrome, not a separate widget. */}
      <div className="flex items-center justify-center gap-8 px-4 text-center">
        <Cell label="item" value={progress} />
        <Cell label="reps" value={repStr} accent={reps > 0} />
        <Cell
          label="threshold"
          value={`${thresholdWpm} wpm`}
          hint={behaviour.burstThreshold === 0 ? "auto" : undefined}
        />
        {lastWpm != null ? (
          <Cell
            label="last"
            value={`${lastWpm} wpm`}
            tone={
              outcome === "win"
                ? "ok"
                : outcome === "slow" || outcome === "wrong"
                  ? "warn"
                  : undefined
            }
          />
        ) : null}
      </div>

      {/* The single word — large, centred, painted through the same
       *  per-letter tokens Passage uses so font / colour overrides
       *  carry through. */}
      <BurstWord
        word={target}
        typed={typedHere}
        blind={behaviour.blindMode}
        mistakeStyle={appearance.mistakeStyle}
        showCaret={caret.style !== "off" && state.phase !== "done"}
        caretStyle={caret.style}
      />

      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {outcome === "wrong"
          ? "wrong — try again"
          : outcome === "slow"
            ? "too slow — reset"
            : typedHere === target && target.length > 0
              ? "press space to commit"
              : typedHere.length === 0
                ? "type the word, then space"
                : ""}
      </p>
    </div>
  );
}

function BurstWord({
  word,
  typed,
  blind,
  mistakeStyle,
  showCaret,
  caretStyle,
}: {
  word: string;
  typed: string;
  blind: boolean;
  mistakeStyle: "color" | "bold" | "underline" | "highlight";
  showCaret: boolean;
  caretStyle: "line" | "block" | "underline" | "outline" | "off";
}) {
  // Use --ft-font-family / --ft-font-scale (the same tokens Passage's
  // scrolling area reads) so the user's typography customisation
  // applies. Word size sits between practice body and the editorial
  // display ramp — large enough to read at a glance, not so big it
  // forces a line break on long words.
  const targetChars = [...word];
  const typedChars = [...typed];
  const len = Math.max(targetChars.length, typedChars.length);
  const cursorChar = Math.min(typedChars.length, targetChars.length);
  return (
    <div
      className="font-mono tracking-tight"
      style={{
        fontFamily: "var(--ft-font-family, inherit)",
        fontSize: "clamp(2.5rem, 7vw, 5rem)",
      }}
    >
      <span className="inline-block whitespace-nowrap">
        {Array.from({ length: len }, (_, ci) => {
          const expected = targetChars[ci];
          const got = typedChars[ci];
          const isExtra = ci >= targetChars.length;
          const glyph = got ?? expected ?? "";

          let cls: string;
          if (blind) cls = UNTYPED_TEXT;
          else if (isExtra) cls = ERROR_TEXT;
          else if (got === undefined) cls = UNTYPED_TEXT;
          else if (got === expected) cls = TYPED_TEXT;
          else cls = ERROR_TEXT;

          const isError =
            !blind && (isExtra || (got !== undefined && got !== expected));
          let errorCls = "";
          let errorStyle: React.CSSProperties | undefined;
          if (isError) {
            if (mistakeStyle === "bold") {
              errorCls = "font-bold";
            } else if (mistakeStyle === "underline") {
              errorCls =
                "underline decoration-2 underline-offset-[6px] decoration-[var(--ft-passage-error,var(--destructive))]";
            } else if (mistakeStyle === "highlight") {
              errorCls = "rounded-sm font-bold";
              errorStyle = {
                backgroundColor:
                  "color-mix(in oklch, var(--ft-passage-error, var(--destructive)) 20%, transparent)",
              };
            }
          }

          // Inline caret: paint the same colour token Passage's
          // CaretGlyph uses (--primary) and only on the cursor position.
          // Skip when caret is off or word is fully typed.
          const isCursor = showCaret && ci === cursorChar && !isExtra;

          return (
            <span key={ci} className="relative inline-block">
              <span className={cn(cls, errorCls)} style={errorStyle}>
                {glyph}
              </span>
              {isCursor ? <InlineCaret style={caretStyle} /> : null}
            </span>
          );
        })}
        {/* End-of-word caret: when typed is complete and waiting for
         *  the space commit, show the caret hugging the trailing edge
         *  of the last character so the user knows the run is ready. */}
        {showCaret && cursorChar === targetChars.length && typed === word ? (
          <span className="relative inline-block">
            <InlineCaret style={caretStyle} trailing />
          </span>
        ) : null}
      </span>
    </div>
  );
}

function InlineCaret({
  style,
  trailing,
}: {
  style: "line" | "block" | "underline" | "outline" | "off";
  trailing?: boolean;
}) {
  // Inline caret — no absolute positioning, no per-char measurement;
  // each variant renders relative to its sibling glyph. Inherits the
  // practice surface's caret token (`var(--primary)`).
  const base = "pointer-events-none absolute ft-caret-blink";
  if (style === "line") {
    return (
      <span
        aria-hidden
        className={cn(base, "top-0 bottom-[0.1em] w-[0.08em]")}
        style={{
          left: trailing ? "100%" : "-0.04em",
          backgroundColor: "var(--primary)",
          borderRadius: "2px",
        }}
      />
    );
  }
  if (style === "block") {
    return (
      <span
        aria-hidden
        className={cn(base, "inset-0")}
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--primary) 35%, transparent)",
          borderRadius: "2px",
        }}
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        aria-hidden
        className={cn(base, "right-0 bottom-0 left-0 h-[0.08em]")}
        style={{ backgroundColor: "var(--primary)" }}
      />
    );
  }
  if (style === "outline") {
    return (
      <span
        aria-hidden
        className={cn(base, "inset-0 border")}
        style={{
          borderColor: "var(--primary)",
          borderRadius: "2px",
        }}
      />
    );
  }
  return null;
}

function Cell({
  label,
  value,
  hint,
  accent,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
        {hint ? (
          <span className="ml-1 text-muted-foreground/60">· {hint}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "ok" && "text-primary",
          tone === "warn" && "text-destructive",
          accent && !tone && "text-primary",
          !accent && !tone && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
