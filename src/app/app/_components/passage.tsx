"use client";

import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

/** Absolutely-positioned blinking caret. Anchored to the left or right
 *  edge of a relatively-positioned character span so it overlays without
 *  consuming horizontal space — text never shifts as the cursor advances.
 */
function Caret({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-[0.1em] bottom-[0.1em] w-0.5 bg-ft-ember",
        side === "left" ? "-left-px" : "-right-px",
      )}
      style={{ animation: "ft-blink 1s steps(2) infinite" }}
    />
  );
}

function ActiveWord({
  word,
  cursorChar,
  showCaret,
}: {
  word: string;
  cursorChar: number;
  showCaret: boolean;
}) {
  const chars = [...word];
  // `inline-block whitespace-nowrap` keeps the word as one line-break unit
  // so per-character spans inside don't make the browser break mid-word.
  return (
    <span className="inline-block whitespace-nowrap">
      {chars.map((char, ci) => {
        const isCursorBefore = ci === cursorChar && showCaret;
        const isCursorAfterLast =
          ci === chars.length - 1 &&
          cursorChar === chars.length &&
          showCaret;
        return (
          <span
            key={ci}
            className={cn(
              "relative",
              ci < cursorChar ? "text-ft-ink" : "text-ft-dim",
            )}
          >
            {isCursorBefore ? <Caret side="left" /> : null}
            {char}
            {isCursorAfterLast ? <Caret side="right" /> : null}
          </span>
        );
      })}
    </span>
  );
}

export function Passage() {
  const { state } = usePractice();
  const { words, cursorWord, cursorChar, errorWords, phase } = state;
  const showCaret = phase !== "done";

  return (
    <div className="text-xl leading-[1.7] font-normal text-ft-dim sm:text-2xl lg:text-[26px]">
      {words.map((word, wi) => {
        if (wi < cursorWord) {
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
          return (
            <span key={wi}>
              <ActiveWord
                word={word}
                cursorChar={cursorChar}
                showCaret={showCaret}
              />{" "}
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
