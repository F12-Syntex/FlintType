"use client";

import { useMemo, type ReactNode } from "react";
import {
  type KeyEvent,
  PracticeContext,
  type Phase,
  type State,
  type WpmSample,
} from "@/app/_components/practice-state";

/** Build a frozen practice State that looks like a partway-through
 *  run — `cursorWord` words finished, `typed[cursorWord]` partly typed,
 *  optional error word marked. The real <Passage> reads `cursorWord`,
 *  `cursorChar`, `errorWords`, `phase`, `typed`, `words` to decide
 *  what to paint, so a fake state with these populated mounts the
 *  real visual chain unmodified. */
function buildState({
  words,
  finishedWords,
  cursorChar,
  errorWord,
  phase,
  events,
}: {
  words: readonly string[];
  finishedWords: number;
  cursorChar: number;
  errorWord?: number;
  phase: Phase;
  events: readonly KeyEvent[];
}): State {
  const typed: string[] = [];
  let totalChars = 0;
  let correctChars = 0;
  for (let i = 0; i < finishedWords; i++) {
    const w = words[i] ?? "";
    typed.push(w);
    totalChars += w.length;
    correctChars += w.length;
  }
  const activeWord = words[finishedWords] ?? "";
  if (phase !== "done") {
    typed.push(activeWord.slice(0, cursorChar));
    totalChars += cursorChar;
    correctChars += cursorChar;
  }

  const errorWords = new Set<number>();
  if (errorWord !== undefined) {
    errorWords.add(errorWord);
    if (errorWord < finishedWords) {
      const target = words[errorWord] ?? "";
      if (target.length > 0) {
        typed[errorWord] = target.slice(0, -1) + "x";
      }
    }
  }

  return {
    mode: "WORDS",
    length: words.length,
    adapt: false,
    phase,
    words: [...words],
    cursorWord: phase === "done" ? words.length : finishedWords,
    cursorChar: phase === "done" ? 0 : cursorChar,
    errorWords,
    totalChars,
    correctChars,
    startTime: Date.now() - 12_000,
    endTime: phase === "done" ? Date.now() : null,
    events: [...events],
    typed,
    quoteSource: null,
  };
}

const NO_HISTORY: readonly WpmSample[] = [];

/** Tiny LCG for deterministic preview noise — same passage produces the
 *  same wpm/event jitter every render so the preview doesn't flicker. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Generate a realistic-looking completed run from a passage: per-char
 *  KeyEvents at ~200ms intervals with light jitter and a couple of
 *  seeded mistypes, plus a per-second WpmSample series with a mild
 *  acceleration / dip / recovery shape. Used by the result preview so
 *  the real <ResultChart> + heatmap render against actual data, not a
 *  "run too short for a chart" fallback. */
function buildSampleRun(words: readonly string[]): {
  events: KeyEvent[];
  wpmHistory: WpmSample[];
  elapsedMs: number;
  wpm: number;
  accuracy: number;
} {
  const rand = lcg(42);
  const baseInterval = 200; // ms per char ≈ 60 wpm
  const events: KeyEvent[] = [];
  let t = 0;
  // Seed errors at deterministic positions so the preview always shows
  // the error colour somewhere in the heatmap.
  const errorAt = new Set<string>([`1:2`, `4:1`]);

  words.forEach((word, wi) => {
    [...word].forEach((ch, ci) => {
      const jitter = (rand() - 0.5) * 80;
      t += baseInterval + jitter;
      const isErr = errorAt.has(`${wi}:${ci}`);
      events.push({
        t: Math.round(t),
        expected: ch,
        typed: isErr ? "x" : ch,
        correct: !isErr,
        wordIndex: wi,
      });
    });
    // Space between words
    t += baseInterval + (rand() - 0.5) * 60;
  });

  const totalChars = events.length;
  const correctChars = events.filter((e) => e.correct).length;
  const accuracy = (correctChars / Math.max(1, totalChars)) * 100;
  const elapsedMs = Math.max(1000, Math.round(t));
  const seconds = Math.max(2, Math.round(elapsedMs / 1000));

  // Build per-second wpm samples with a believable curve: cold start,
  // climb to mid-test peak, small dip near errors, recovery.
  const peakSec = Math.floor(seconds * 0.55);
  const wpmHistory: WpmSample[] = [];
  for (let s = 1; s <= seconds; s++) {
    const fromPeak = Math.abs(s - peakSec) / Math.max(1, peakSec);
    const base = 70 - fromPeak * 22; // peaks ≈ 70, floors ≈ 48
    const noise = (rand() - 0.5) * 6;
    const wpm = Math.max(20, Math.round(base + noise));
    const raw = wpm + 4 + Math.round(rand() * 4);
    wpmHistory.push({ t: s * 1000, wpm, raw });
  }
  const avg =
    wpmHistory.reduce((sum, s) => sum + s.wpm, 0) / Math.max(1, wpmHistory.length);
  return { events, wpmHistory, elapsedMs, wpm: Math.round(avg), accuracy };
}

/** Mounts a frozen <Practice> context so the real Passage / Readouts /
 *  TestSummary / any other practice consumer can render exactly as on
 *  the live test screen — no mock components, no duplicated rendering
 *  logic.
 *
 *  Defaults to a partway-through run (`phase: "running"`) so previews
 *  for caret / typography / colours show the active passage chain. Pass
 *  `phase: "done"` to flip into the completed-run shape — wpmHistory
 *  and events get auto-seeded with a realistic sample so <ResultChart>
 *  and PassageHeatmap render rich, not "Run too short for a chart". */
export function PreviewPracticeProvider({
  children,
  words = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"],
  finishedWords = 4,
  cursorChar = 2,
  errorWord = 1,
  phase = "running",
  wpm,
  accuracy,
  elapsedMs,
}: {
  children: ReactNode;
  words?: readonly string[];
  finishedWords?: number;
  cursorChar?: number;
  errorWord?: number;
  phase?: Phase;
  wpm?: number;
  accuracy?: number;
  elapsedMs?: number;
}) {
  const value = useMemo(() => {
    const sample =
      phase === "done"
        ? buildSampleRun(words)
        : { events: [], wpmHistory: NO_HISTORY, elapsedMs: 12_000, wpm: 64, accuracy: 96 };

    const state = buildState({
      words,
      finishedWords,
      cursorChar,
      errorWord,
      phase,
      events: sample.events,
    });
    return {
      state,
      dispatch: () => {},
      setMode: () => {},
      setLength: () => {},
      toggleAdapt: () => {},
      restart: () => {},
      elapsedMs: elapsedMs ?? sample.elapsedMs,
      wpm: wpm ?? sample.wpm,
      raw: (wpm ?? sample.wpm) + 4,
      accuracy: accuracy ?? sample.accuracy,
      wpmHistory: sample.wpmHistory,
      adaptLoading: false,
      suddenDeathRestarts: 0,
    };
  }, [
    words,
    finishedWords,
    cursorChar,
    errorWord,
    phase,
    wpm,
    accuracy,
    elapsedMs,
  ]);

  return (
    <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>
  );
}
