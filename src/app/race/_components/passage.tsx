"use client";

import { useRace } from "./race-state";
import { useRaceInput } from "./use-race-input";
import { cn } from "@/lib/utils";

/** Race passage. Lights the typed prefix in paper, the next-to-type
 *  letter under a coral caret, and the rest in muted-warm. The
 *  current word also shows the user's in-progress typed buffer
 *  inline — correct chars in paper, wrong in destructive. Mounts a
 *  window-level keyboard handler via `useRaceInput`; the surface
 *  itself doesn't need focus. */
export function RacePassage() {
  useRaceInput();
  const { state, cursors, yourWpm, yourAccuracy, countdownNumber } = useRace();
  const youCursor = cursors[state.racers.findIndex((r) => r.isYou)]!;
  const wordIdx = youCursor.wordIdx;
  const typedInWord = state.typedInWord;

  const you = state.racers[state.racers.findIndex((r) => r.isYou)]!;
  // Treat "all chars typed" as "all words done", since the final
  // word doesn't carry a trailing space — wordIdx alone tops out at
  // words.length - 1 even after the run is complete.
  const wordsDone =
    state.totalChars > 0 && you.correctChars >= state.totalChars
      ? state.words.length
      : wordIdx;

  return (
    <div className="relative flex flex-1 flex-col border border-ft-ink-line bg-ft-ink-deep px-7 py-8 sm:px-9">
      <div className="mb-5 flex flex-wrap justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ft-warm-3">
          YOUR TRACK · {wordsDone}/{state.words.length} WORDS
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-ft-warm-2">
          <span className="text-ft-ember">WPM {yourWpm}</span>
          <span>ACC {yourAccuracy.toFixed(1)}%</span>
          <span>
            {state.phase === "lobby"
              ? "READY"
              : state.phase === "countdown"
                ? "STARTING"
                : state.phase === "finished"
                  ? "FINISHED"
                  : "RACING"}
          </span>
        </div>
      </div>

      <p className="m-0 break-words text-lg leading-[1.7] text-ft-warm-4 sm:text-xl lg:text-[22px]">
        {state.words.map((w, wi) => (
          <Word
            key={wi}
            word={w}
            index={wi}
            cursorWord={wordIdx}
            typedInWord={typedInWord}
            isLast={wi === state.words.length - 1}
          />
        ))}
      </p>

      {state.phase === "countdown" && countdownNumber != null ? (
        <CountdownOverlay n={countdownNumber} />
      ) : null}
    </div>
  );
}

function Word({
  word,
  index,
  cursorWord,
  typedInWord,
  isLast,
}: {
  word: string;
  index: number;
  cursorWord: number;
  typedInWord: string;
  isLast: boolean;
}) {
  // Past word: paper-ink (you typed it correctly to advance past it).
  if (index < cursorWord) {
    return (
      <>
        <span className="text-ft-paper">{word}</span>
        {isLast ? null : <span className="text-ft-warm-4"> </span>}
      </>
    );
  }
  // Future word: warm-4 muted.
  if (index > cursorWord) {
    return (
      <>
        <span className="text-ft-warm-4">{word}</span>
        {isLast ? null : <span className="text-ft-warm-4"> </span>}
      </>
    );
  }
  // Active word: split into typed prefix + caret + remainder.
  const typedLen = typedInWord.length;
  const typed = word.slice(0, typedLen);
  const remaining = word.slice(typedLen);
  return (
    <span className="relative">
      <span className="text-ft-paper">{typed}</span>
      <span
        aria-hidden
        className="mx-px inline-block h-[1.05em] w-0.5 align-text-bottom bg-ft-ember"
        style={{ animation: "ft-blink 1s steps(2) infinite" }}
      />
      <span className={cn("text-ft-warm-4")}>{remaining}</span>
      {isLast ? null : <span className="text-ft-warm-4"> </span>}
    </span>
  );
}

function CountdownOverlay({ n }: { n: number }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-ft-ink-deep/85"
    >
      <span className="text-[11px] uppercase tracking-[0.22em] text-ft-warm-2">
        Starting in
      </span>
      <span className="font-mono text-7xl font-extrabold tabular-nums text-ft-ember sm:text-8xl">
        {n === 0 ? "GO" : n}
      </span>
    </div>
  );
}
