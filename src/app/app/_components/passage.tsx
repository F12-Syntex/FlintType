"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  registerRef,
}: {
  word: string;
  cursorChar: number;
  showCaret: boolean;
  registerRef: (el: HTMLSpanElement | null) => void;
}) {
  const chars = [...word];
  // `inline-block whitespace-nowrap` keeps the word as one line-break unit
  // so per-character spans inside don't make the browser break mid-word.
  return (
    <span ref={registerRef} className="inline-block whitespace-nowrap">
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

  // Smooth line scroll: the inner block translates up so the active word
  // stays vertically centered in the visible viewport. Replaces the old
  // scrollIntoView() which jumped abruptly when a word wrapped to the
  // next visual line.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const [translateY, setTranslateY] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    const word = activeWordRef.current;
    if (!container || !inner || !word) return;

    const containerRect = container.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();

    // Word's top, relative to the inner block's natural origin (cancelling
    // the current translateY by reading getBoundingClientRect on the inner
    // container). We want the word centered vertically in the viewport.
    const wordTopWithinInner = wordRect.top - innerRect.top;
    const target =
      containerRect.height / 2 - wordTopWithinInner - wordRect.height / 2;

    setTranslateY(target);
  }, [cursorWord, words.length]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
    >
      <div
        ref={innerRef}
        style={{
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: "transform 260ms cubic-bezier(.22, 0.8, 0.22, 1)",
          willChange: "transform",
        }}
        className="select-none text-2xl leading-[2.2] font-normal text-ft-dim tracking-[0.04em] [word-spacing:0.25em] sm:text-3xl sm:leading-[2.3] lg:text-4xl lg:leading-[2.4]"
      >
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
                  registerRef={(el) => {
                    activeWordRef.current = el;
                  }}
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
    </div>
  );
}
