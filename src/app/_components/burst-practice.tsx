"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { resolveBurstThreshold } from "@/lib/avg-wpm-cache";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useLifetimeStats } from "@/lib/use-lifetime-stats";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

/** BURST mode controller.
 *
 *  Visually, BURST renders through the same `<Passage />` component
 *  WORDS uses — same typography, caret, colour tokens, settings. The
 *  controller below owns the *behaviour* on top of that:
 *    - Tracks per-word attempt start time
 *    - Intercepts SPACE (InputCapture skips its dispatch in BURST)
 *    - Computes WPM for the just-typed attempt
 *    - Decides: advance (dispatch SPACE), retry (BURST_RESET),
 *      or fail-and-reset (BURST_RESET + clear rep counter)
 *    - Grants `XP_PER_DRILL` via lifetimeStats.drillsCompleted on
 *      the natural phase=done transition (last word, final rep
 *      → standard reducer SPACE flow sets phase=done; no special
 *      finish action needed).
 *
 *  Renders a small below-passage strip showing item progress and the
 *  current rep streak so the user can read "where am I" without
 *  guessing. */
export function BurstPractice() {
  const { state, dispatch, restart: _restart } = usePractice();
  void _restart;
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const { incrementDrillsCompleted } = useLifetimeStats();

  const thresholdWpm = useMemo(
    () => resolveBurstThreshold(behaviour.burstThreshold),
    [behaviour.burstThreshold],
  );
  const repsPerItem = Math.max(1, appearance.burstReps);

  // Per-attempt start time. Updated when typed[cursorWord] goes
  // 0 → 1 (first keystroke of an attempt). null between attempts.
  const attemptStartRef = useRef<number | null>(null);
  const prevTypedLenRef = useRef(0);
  // Per-word rep counter. Resets on cursorWord change OR on a fail
  // (wrong word / slow attempt).
  const [reps, setReps] = useState(0);
  const repsRef = useRef(reps);
  repsRef.current = reps;
  // Most recent attempt's WPM, surfaced in the strip.
  const [lastWpm, setLastWpm] = useState<number | null>(null);
  // Brief outcome flash (win / slow / wrong) — clears after 350ms.
  const [outcome, setOutcome] = useState<"win" | "slow" | "wrong" | null>(
    null,
  );

  const cursorWord = state.cursorWord;
  const typedHere = state.typed[cursorWord] ?? "";
  const target = state.words[cursorWord] ?? "";

  // Track attempt start. The first character of an attempt is the
  // 0→1 transition; subsequent characters keep the same start time.
  // A BURST_RESET drops typed[cursor] back to "" — we observe the
  // length flip and clear the start.
  useEffect(() => {
    const len = typedHere.length;
    if (len === 1 && prevTypedLenRef.current === 0) {
      attemptStartRef.current = Date.now();
    } else if (len === 0) {
      attemptStartRef.current = null;
    }
    prevTypedLenRef.current = len;
  }, [typedHere]);

  // Reset the rep counter whenever the cursor moves to a new word.
  useEffect(() => {
    setReps(0);
  }, [cursorWord]);

  // Reset everything (reps, attempt, flash) on RESTART — state.words
  // identity change is the cleanest signal for "fresh run".
  useEffect(() => {
    setReps(0);
    setOutcome(null);
    setLastWpm(null);
    attemptStartRef.current = null;
    prevTypedLenRef.current = 0;
  }, [state.words]);

  // SPACE handler — the controller's entire job condensed into one
  // function. InputCapture skips its own SPACE dispatch in BURST.
  const handleSpace = useCallback(() => {
    if (state.phase === "done" || state.phase === "rest") return;
    const tgt = state.words[state.cursorWord] ?? "";
    const typed = state.typed[state.cursorWord] ?? "";
    // Wrong attempt: any deviation from the target is a reset, regardless
    // of how many chars they have. Length mismatch also counts.
    if (typed !== tgt) {
      setOutcome("wrong");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    // Compute WPM for this attempt.
    const startedAt = attemptStartRef.current;
    const now = Date.now();
    if (startedAt == null) {
      // Impossible-state: typed === target with no attempt start. Treat
      // as a slow attempt rather than crashing.
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
    // Successful attempt at threshold.
    setOutcome("win");
    const nextReps = repsRef.current + 1;
    if (nextReps < repsPerItem) {
      // Same word, fresh attempt.
      setReps(nextReps);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    // Rep complete — advance via the standard SPACE action. The
    // reducer handles the cursorWord increment + (if last word)
    // phase=done transition for us.
    setReps(0);
    dispatch({
      type: "SPACE",
      now,
      // strictSpace=false: the typed buffer matches target exactly,
      // so the gate is always satisfied; this argument is irrelevant
      // here but defined for shape.
      strictSpace: false,
    });
  }, [
    state.phase,
    state.cursorWord,
    state.typed,
    state.words,
    thresholdWpm,
    repsPerItem,
    dispatch,
  ]);

  // Outcome flash — fades the badge after a brief tick so wins / slow
  // / wrong feedback is visible but doesn't linger.
  useEffect(() => {
    if (outcome == null) return;
    const id = setTimeout(() => setOutcome(null), 400);
    return () => clearTimeout(id);
  }, [outcome]);

  // Wire the SPACE listener at the window level. We listen on keydown
  // (matching InputCapture's keydown path) and only react to the
  // space key. Modifier keys, modal dialogs, and focused inputs are
  // already filtered by InputCapture before SPACE would reach this
  // controller; the duplicate guards here cover the case where the
  // user is focused outside the hidden typing input.
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

  // XP grant: when phase transitions to done in BURST, increment
  // lifetimeStats.drillsCompleted. The standard test-submit effect
  // already short-circuits on BURST (no test row, no adapt feed).
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

  // Status strip. Sits under the passage; same eyebrow / mono / tight-
  // tracking style as the live readouts so it reads as part of the
  // practice chrome, not a separate widget.
  const itemsLength = state.words.length;
  const progress = `${Math.min(state.cursorWord, itemsLength)}/${itemsLength}`;
  const repStr = `${reps}/${repsPerItem}`;
  return (
    <div className="flex items-center justify-center gap-8 px-4 pb-2 text-center font-mono">
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
          tone={outcome === "win" ? "ok" : outcome === "slow" ? "warn" : undefined}
        />
      ) : null}
    </div>
  );
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
