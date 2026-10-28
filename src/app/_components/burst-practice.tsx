"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { resolveBurstThreshold } from "@/lib/avg-wpm-cache";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useLifetimeStats } from "@/lib/use-lifetime-stats";
import { useRecordBurstTry } from "./burst-log";
import { usePractice } from "./practice-state";

/* ─── Shared state ───────────────────────────────────────────── */

type BurstOutcome = "win" | "slow" | "wrong" | null;

type BurstContextValue = {
  reps: number;
  repsRequired: number;
  threshold: number;
  thresholdAuto: boolean;
  lastWpm: number | null;
  outcome: BurstOutcome;
};

const BurstContext = createContext<BurstContextValue | null>(null);

/** Read-only burst slice for the readouts and word view
 *  (burst-view.tsx). */
export function useBurstView(): BurstContextValue {
  const v = useContext(BurstContext);
  if (!v) {
    throw new Error("BurstReadouts / BurstWordView must mount inside BurstProvider");
  }
  return v;
}

/** Mount once at TypingSurface root when mode === BURST. Owns the
 *  per-attempt timer, the rep counter, the SPACE intercept, and the
 *  XP grant. Exposes the read-only slice (reps / lastWpm / outcome /
 *  threshold) via context so the readouts row and the word view can
 *  both render without recomputing. */
export function BurstProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = usePractice();
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const { incrementDrillsCompleted } = useLifetimeStats();

  const threshold = useMemo(
    () => resolveBurstThreshold(behaviour.burstThreshold),
    [behaviour.burstThreshold],
  );
  const thresholdAuto = behaviour.burstThreshold === 0;
  const repsRequired = Math.max(1, appearance.burstReps);

  const attemptStartRef = useRef<number | null>(null);
  const prevTypedLenRef = useRef(0);
  const [reps, setReps] = useState(0);
  const repsRef = useRef(reps);
  repsRef.current = reps;
  const [lastWpm, setLastWpm] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<BurstOutcome>(null);

  const cursorWord = state.cursorWord;
  const typedHere = state.typed[cursorWord] ?? "";

  // Try log for the results screen (burst-log.tsx). Each try is timed
  // on the same clock as `lastWpm`: from its first key to the key that
  // ends it. The refs mirror the live state so the space handler and
  // the effects below read current values without re-subscribing.
  const recordTry = useRecordBurstTry();
  const liveRef = useRef(state);
  // Layout effect: runs before the effects below in the same commit.
  useLayoutEffect(() => {
    liveRef.current = state;
  });
  const tryFirstEventRef = useRef(0);
  const tryWordsRef = useRef<readonly string[]>(state.words);

  /** Close the open try (no-op when none is open) and log it. */
  const closeTry = useCallback(
    (now: number, endedBySpace: boolean, cleared: boolean) => {
      const startedAt = attemptStartRef.current;
      if (startedAt == null) return;
      attemptStartRef.current = null;
      const s = liveRef.current;
      // A try left open across a new passage belongs to neither.
      if (tryWordsRef.current !== s.words) return;
      recordTry(
        {
          endT: Math.max(0, now - (s.startTime ?? startedAt)),
          ms: Math.max(1, now - startedAt),
          keys: Math.max(1, s.events.length - tryFirstEventRef.current),
          chars: (s.words[s.cursorWord] ?? "").length,
          endedBySpace,
          cleared,
        },
        tryWordsRef.current,
      );
    },
    [recordTry],
  );

  useEffect(() => {
    const len = typedHere.length;
    if (len === 1 && prevTypedLenRef.current === 0) {
      attemptStartRef.current = Date.now();
      tryFirstEventRef.current = liveRef.current.events.length - 1;
      tryWordsRef.current = liveRef.current.words;
    } else if (len === 0) {
      // Still open here means the buffer was cleared from outside the
      // burst rules (Tab retries the word): log it as a try that didn't
      // clear. Rule outcomes close their try before they reset.
      if (liveRef.current.phase === "running") closeTry(Date.now(), false, false);
      attemptStartRef.current = null;
    }
    prevTypedLenRef.current = len;
  }, [typedHere, closeTry]);

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

  // Strict burst: reset the moment a mistake is made, not at the space.
  // The instant the typed buffer stops being a prefix of the target
  // (a wrong char, or typing past the word), wipe the word and break
  // the rep streak — same failure the SPACE handler catches on a wrong
  // word, just caught immediately so a burst can't be sloppily
  // backspace-corrected.
  useEffect(() => {
    if (state.phase === "done" || state.phase === "rest") return;
    const tgt = state.words[cursorWord] ?? "";
    if (typedHere.length > 0 && !tgt.startsWith(typedHere)) {
      closeTry(Date.now(), false, false);
      setOutcome("wrong");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
    }
  }, [typedHere, cursorWord, state.phase, state.words, dispatch, closeTry]);

  const handleSpace = useCallback(() => {
    if (state.phase === "done" || state.phase === "rest") return;
    const tgt = state.words[state.cursorWord] ?? "";
    const typed = state.typed[state.cursorWord] ?? "";
    const startedAt = attemptStartRef.current;
    const now = Date.now();
    if (typed !== tgt) {
      closeTry(now, true, false);
      setOutcome("wrong");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    if (startedAt == null) {
      setOutcome("slow");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    const ms = Math.max(1, now - startedAt);
    const wpm = (tgt.length / 5) * (60_000 / ms);
    const wpmRounded = Math.round(wpm);
    setLastWpm(wpmRounded);
    if (wpm < threshold) {
      closeTry(now, true, false);
      setOutcome("slow");
      setReps(0);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    closeTry(now, true, true);
    setOutcome("win");
    const nextReps = repsRef.current + 1;
    if (nextReps < repsRequired) {
      setReps(nextReps);
      dispatch({ type: "BURST_RESET" });
      return;
    }
    setReps(0);
    dispatch({ type: "SPACE", now, strictSpace: false, backspaceLocked: false });
  }, [
    state.phase,
    state.cursorWord,
    state.typed,
    state.words,
    threshold,
    repsRequired,
    dispatch,
    closeTry,
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

  const value: BurstContextValue = {
    reps,
    repsRequired,
    threshold,
    thresholdAuto,
    lastWpm,
    outcome,
  };
  return <BurstContext.Provider value={value}>{children}</BurstContext.Provider>;
}
