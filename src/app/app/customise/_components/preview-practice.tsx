"use client";

import { useMemo, type ReactNode } from "react";
import {
  PracticeContext,
  type State,
  type WpmSample,
} from "@/app/app/_components/practice-state";

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
}: {
  words: readonly string[];
  finishedWords: number;
  cursorChar: number;
  errorWord?: number;
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
  typed.push(activeWord.slice(0, cursorChar));
  totalChars += cursorChar;
  correctChars += cursorChar;

  const errorWords = new Set<number>();
  if (errorWord !== undefined) {
    errorWords.add(errorWord);
    if (errorWord < finishedWords) {
      // Make the typed[errorWord] reflect a misspelling — last char
      // gets swapped so the past-error renderer paints it.
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
    phase: "running",
    words: [...words],
    cursorWord: finishedWords,
    cursorChar,
    errorWords,
    totalChars,
    correctChars,
    startTime: Date.now() - 12_000,
    endTime: null,
    events: [],
    typed,
    quoteSource: null,
  };
}

const NO_HISTORY: readonly WpmSample[] = [];

/** Mounts a frozen <Practice> context so the real Passage / Readouts /
 *  any other practice consumer can render exactly as on the live test
 *  screen — no mock components, no duplicated rendering logic.
 *
 *  Pass mock numbers (`wpm`, `accuracy`, `elapsedMs`) so the live-stat
 *  readouts have realistic-looking values; pass `errorWord` to surface
 *  the error colour token in the typed history. Dispatch and action
 *  helpers are noops — the preview is read-only. */
export function PreviewPracticeProvider({
  children,
  words = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"],
  finishedWords = 4,
  cursorChar = 2,
  errorWord = 1,
  wpm = 64,
  accuracy = 96,
  elapsedMs = 12_000,
}: {
  children: ReactNode;
  words?: readonly string[];
  finishedWords?: number;
  cursorChar?: number;
  errorWord?: number;
  wpm?: number;
  accuracy?: number;
  elapsedMs?: number;
}) {
  const value = useMemo(() => {
    const state = buildState({ words, finishedWords, cursorChar, errorWord });
    return {
      state,
      dispatch: () => {},
      setMode: () => {},
      setLength: () => {},
      toggleAdapt: () => {},
      restart: () => {},
      elapsedMs,
      wpm,
      raw: wpm + 4,
      accuracy,
      wpmHistory: NO_HISTORY,
      adaptLoading: false,
      suddenDeathRestarts: 0,
    };
  }, [words, finishedWords, cursorChar, errorWord, wpm, accuracy, elapsedMs]);

  return (
    <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>
  );
}
