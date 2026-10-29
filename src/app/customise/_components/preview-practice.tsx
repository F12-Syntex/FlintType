"use client";

import { useMemo, type ReactNode } from "react";
import {
  PracticeContext,
  type Phase,
  type WpmSample,
} from "@/app/_components/practice-state";
import { buildDoneRun, buildState } from "./preview-sample";

const NO_HISTORY: readonly WpmSample[] = [];

/** The sample text every preview types through. Long enough to fill
 *  several lines like a real test, so Lines shown, Line width and the
 *  font size visibly change it. The first nine words are the pangram
 *  the previews' cursor and error positions are tuned to. */
export const PREVIEW_WORDS: readonly string[] = [
  "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog",
  "and", "then", "runs", "back", "across", "the", "open", "field", "to",
  "find", "a", "quiet", "place", "where", "the", "light", "falls", "soft",
  "on", "the", "grass", "as", "the", "long", "day", "slows", "down",
];

/** Just the pangram: a short sample run for the result preview. */
export const PREVIEW_PANGRAM: readonly string[] = PREVIEW_WORDS.slice(0, 9);

/** Mounts a frozen <Practice> context so the real Passage / Readouts /
 *  TestSummary / any other practice consumer can render exactly as on
 *  the live test screen — no mock components, no duplicated rendering
 *  logic.
 *
 *  Defaults to a partway-through run (`phase: "running"`) so previews
 *  for caret / typography / colours show the active passage chain. Pass
 *  `phase: "done"` to flip into the completed-run shape: a seeded sample
 *  run (preview-sample.ts) on one clock, with a fixed analysis source,
 *  so <ResultChart>, the heatmap and the analysis card render rich. */
export function PreviewPracticeProvider({
  children,
  words = PREVIEW_WORDS,
  finishedWords = 4,
  cursorChar = 2,
  errorWord = 1,
  phase = "running",
  activeWordTyped,
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
  /** Override the active word's typed string — used by Mistakes preview
   *  to show wrong / extra chars without simulated typing. When set,
   *  `cursorChar` is overridden to sit after the typed string. */
  activeWordTyped?: string;
  wpm?: number;
  accuracy?: number;
  elapsedMs?: number;
}) {
  const value = useMemo(() => {
    // The done run (preview-sample.ts) is one clock and a fixed analysis
    // source, so the result preview reads the same whatever the viewer's
    // own settings. The running phases keep the partway state.
    const done = phase === "done" ? buildDoneRun(words) : null;
    const sample = done
      ? done.sample
      : { events: [], wpmHistory: NO_HISTORY, elapsedMs: 12_000, wpm: 64, raw: 68, accuracy: 96 };
    const state =
      done?.state ??
      buildState({
        words,
        finishedWords,
        cursorChar:
          activeWordTyped !== undefined ? activeWordTyped.length : cursorChar,
        errorWord,
        phase: phase === "done" ? "running" : phase,
        events: sample.events,
        activeWordTyped,
      });
    return {
      state,
      dispatch: () => {},
      setMode: () => {},
      setLength: () => {},
      toggleAdapt: () => {},
      setWordlist: () => {},
      wordlist: "english",
      restart: () => {},
      elapsedMs: elapsedMs ?? sample.elapsedMs,
      wpm: wpm ?? sample.wpm,
      raw: wpm !== undefined ? wpm + 4 : sample.raw,
      accuracy: accuracy ?? sample.accuracy,
      wpmHistory: sample.wpmHistory,
      adaptLoading: false,
      suddenDeathRestarts: 0,
      lastTestId: null,
      lastTestIsPb: null,
      runAnalysisSource: done?.source ?? null,
    };
  }, [
    words,
    finishedWords,
    cursorChar,
    errorWord,
    phase,
    activeWordTyped,
    wpm,
    accuracy,
    elapsedMs,
  ]);

  return (
    <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>
  );
}
