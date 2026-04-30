"use client";

import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

export function Passage() {
  const { state } = usePractice();
  const { words, cursorWord, cursorChar, errorWords, phase } = state;

  return (
    <div className="text-xl leading-[1.7] font-normal text-ft-dim sm:text-2xl lg:text-[26px]">
      {words.map((word, wi) => {
        if (wi < cursorWord) {
          // Already finished
          const isErr = errorWords.has(wi);
          return (
            <span
              key={wi}
              className={cn(
                "text-ft-ink",
                isErr &&
                  "text-ft-ember underline decoration-1 underline-offset-[6px]",
              )}
            >
              {word}{" "}
            </span>
          );
        }
        if (wi === cursorWord) {
          // Active word — split at cursor
          const showCaret = phase !== "done";
          return (
            <span key={wi} className="relative">
              <span className="text-ft-ink">{word.slice(0, cursorChar)}</span>
              {showCaret ? (
                <span
                  className="mx-px inline-block h-[1.1em] w-0.5 align-text-bottom bg-ft-ember"
                  style={{ animation: "ft-blink 1s steps(2) infinite" }}
                  aria-hidden
                />
              ) : null}
              <span className="text-ft-dim">{word.slice(cursorChar)}</span>{" "}
            </span>
          );
        }
        return (
          <span key={wi} className="text-ft-dim">
            {word}{" "}
          </span>
        );
      })}
    </div>
  );
}
