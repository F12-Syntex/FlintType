"use client";

import { ArrowLeft, Skull } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StreakGrid } from "./streak-grid";

/** Sudden-death drill: clear the whole passage with zero mistakes.
 *  A single wrong character resets the cursor to word 0 and the
 *  streak grid empties. Goal is the run, not the WPM. */
type SuddenDeathProps = {
  title: string;
  subtitle: string;
  words: readonly string[];
  onExit: () => void;
};

type State = {
  cursorWord: number;
  cursorChar: number;
  /** Per-word typed input — populated as the user types, reset on
   *  every restart. Used to render the in-progress word. */
  typed: string[];
  /** Number of perfect-clear restarts the user has burned. Surfaced
   *  in the footer so they see the cost mounting. */
  restarts: number;
  /** Counts up monotonically each restart so the UI can re-key
   *  components and play the failure flash. */
  failureFlashTick: number;
  /** Set the moment the last word's last char goes in correctly. */
  finished: boolean;
};

type Action =
  | { type: "TYPE_CHAR"; char: string; words: readonly string[] }
  | { type: "BACKSPACE" }
  | { type: "RESET_FLASH" }
  | { type: "RESTART_TO_TOP" };

const initialState: State = {
  cursorWord: 0,
  cursorChar: 0,
  typed: [],
  restarts: 0,
  failureFlashTick: 0,
  finished: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESTART_TO_TOP":
      return {
        ...initialState,
        restarts: state.restarts + 1,
        failureFlashTick: state.failureFlashTick + 1,
      };
    case "RESET_FLASH":
      return { ...state, failureFlashTick: 0 };
    case "BACKSPACE": {
      // Sudden death is unforgiving — backspace is allowed within
      // the *current* word (so the user can fix a typo before
      // committing it as wrong) but never to retreat into previous
      // words. Once a word is past, it's locked in.
      if (state.cursorChar === 0) return state;
      const next = [...state.typed];
      next[state.cursorWord] = (next[state.cursorWord] ?? "").slice(0, -1);
      return {
        ...state,
        cursorChar: state.cursorChar - 1,
        typed: next,
      };
    }
    case "TYPE_CHAR": {
      if (state.finished) return state;
      const word = action.words[state.cursorWord];
      if (!word) return state;

      // The mid-word path treats space as "advance to next word
      // *if* the word is fully correct so far". Anything else is
      // either a correct char in the word or the death trigger.
      if (action.char === " ") {
        const typedHere = state.typed[state.cursorWord] ?? "";
        const wordCorrect = typedHere === word;
        if (!wordCorrect) {
          // Premature space = ended a word too early. Death.
          return restart(state);
        }
        const nextIdx = state.cursorWord + 1;
        if (nextIdx >= action.words.length) {
          // Tried to space past the last word. Treat as no-op so
          // the run can finish on the last char of the last word.
          return state;
        }
        return {
          ...state,
          cursorWord: nextIdx,
          cursorChar: 0,
        };
      }

      const expected = word[state.cursorChar];
      if (expected === undefined || action.char !== expected) {
        return restart(state);
      }
      const nextChar = state.cursorChar + 1;
      const next = [...state.typed];
      while (next.length <= state.cursorWord) next.push("");
      next[state.cursorWord] = (next[state.cursorWord] ?? "") + action.char;
      const lastWord = state.cursorWord === action.words.length - 1;
      const wordDone = nextChar === word.length;
      if (lastWord && wordDone) {
        return {
          ...state,
          cursorChar: nextChar,
          typed: next,
          finished: true,
        };
      }
      return {
        ...state,
        cursorChar: nextChar,
        typed: next,
      };
    }
  }
}

function restart(state: State): State {
  return {
    ...initialState,
    restarts: state.restarts + 1,
    failureFlashTick: state.failureFlashTick + 1,
  };
}

export function SuddenDeath({
  title,
  subtitle,
  words,
  onExit,
}: SuddenDeathProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  // Failure flash auto-clears after 350ms — long enough to register
  // as visceral, short enough that the next attempt feels fresh.
  useEffect(() => {
    if (state.failureFlashTick === 0) return;
    const id = setTimeout(() => dispatch({ type: "RESET_FLASH" }), 350);
    return () => clearTimeout(id);
  }, [state.failureFlashTick]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
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
    if (e.key === "Escape") {
      e.preventDefault();
      onExit();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      dispatch({ type: "RESTART_TO_TOP" });
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      dispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      dispatch({ type: "TYPE_CHAR", char: e.key, words: wordsRef.current });
    }
  }, [onExit]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const failed = state.failureFlashTick > 0;
  const total = words.length;
  const done = state.cursorWord;

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle}
        onExit={onExit}
        restarts={state.restarts}
      />

      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-10 px-5 py-10 transition-colors duration-300 sm:px-16",
          failed && "bg-destructive/5",
        )}
      >
        {state.finished ? (
          <Cleared restarts={state.restarts} onExit={onExit} />
        ) : (
          <>
            <Passage
              words={words}
              cursorWord={state.cursorWord}
              cursorChar={state.cursorChar}
              typed={state.typed}
              failed={failed}
            />

            <div className="flex w-full max-w-xl flex-col items-center gap-3">
              <Tag>{done} / {total} CLEARED</Tag>
              <StreakGrid
                total={total}
                done={done}
                active={done < total ? done : null}
                cellsPerRow={Math.min(total, 20)}
                failed={failed}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Skull size={14} className="text-destructive/70" />
              <span>1 mistake = back to word 1. <kbd className="ml-2 rounded-sm border border-foreground/10 bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-widest">Tab</kbd> restarts.</span>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function Passage({
  words,
  cursorWord,
  cursorChar,
  typed,
  failed,
}: {
  words: readonly string[];
  cursorWord: number;
  cursorChar: number;
  typed: readonly string[];
  failed: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl select-none text-center font-normal leading-[2] tracking-[0.04em] text-[calc(var(--ft-font-scale,1)*1.5rem)] sm:text-[calc(var(--ft-font-scale,1)*1.75rem)] lg:text-[calc(var(--ft-font-scale,1)*2rem)]",
        failed && "animate-pulse",
      )}
      style={{
        fontFamily: "var(--ft-font-family, inherit)",
        wordSpacing: "var(--ft-word-spacing, 0.25em)",
      }}
    >
      {words.map((word, wi) => {
        if (wi < cursorWord) {
          return (
            <span key={wi} className="text-primary">
              {word}{" "}
            </span>
          );
        }
        if (wi === cursorWord) {
          const typedHere = typed[wi] ?? "";
          return (
            <span key={wi}>
              {[...word].map((ch, ci) => {
                const t = typedHere[ci];
                const isCursor = ci === cursorChar;
                const cls =
                  t === undefined
                    ? "text-muted-foreground"
                    : t === ch
                      ? "text-primary"
                      : "text-destructive";
                return (
                  <span
                    key={ci}
                    className={cn(
                      cls,
                      isCursor && "border-b-2 border-primary",
                    )}
                  >
                    {ch}
                  </span>
                );
              })}
              {" "}
            </span>
          );
        }
        return (
          <span key={wi} className="text-muted-foreground">
            {word}{" "}
          </span>
        );
      })}
    </div>
  );
}

function Header({
  title,
  subtitle,
  onExit,
  restarts,
}: {
  title: string;
  subtitle: string;
  onExit: () => void;
  restarts: number;
}) {
  return (
    <section className="border-b border-foreground/10 px-5 pt-8 pb-5 sm:px-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Tag>{subtitle}</Tag>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Restarts: <span className="font-bold tabular-nums text-foreground">{restarts}</span>
          </span>
          <Button variant="outline" size="sm" onClick={onExit} className="gap-2">
            <ArrowLeft size={14} />
            Back to drills
          </Button>
        </div>
      </div>
    </section>
  );
}

function Cleared({ restarts, onExit }: { restarts: number; onExit: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Tag>RUN CLEAR</Tag>
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Clean run, no mistakes.
      </h2>
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <span className="text-[10px] uppercase tracking-[0.18em]">Restarts burned</span>
        <span className="text-3xl font-bold tabular-nums text-foreground">
          {restarts}
        </span>
      </div>
      <Button onClick={onExit} className="gap-2">
        Back to drills
      </Button>
    </div>
  );
}
