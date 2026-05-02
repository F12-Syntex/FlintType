"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

type CaretPos = { left: number; top: number; height: number };

function ActiveWord({
  word,
  cursorChar,
  registerTarget,
}: {
  word: string;
  cursorChar: number;
  registerTarget: (el: HTMLSpanElement | null, side: "left" | "right") => void;
}) {
  const chars = [...word];
  // `inline-block whitespace-nowrap` keeps the word as one line-break unit
  // so per-character spans inside don't make the browser break mid-word.
  return (
    <span className="inline-block whitespace-nowrap">
      {chars.map((char, ci) => {
        const isBeforeTarget = ci === cursorChar;
        const isAfterLastTarget =
          cursorChar >= chars.length && ci === chars.length - 1;
        const ref =
          isBeforeTarget
            ? (el: HTMLSpanElement | null) => registerTarget(el, "left")
            : isAfterLastTarget
              ? (el: HTMLSpanElement | null) => registerTarget(el, "right")
              : null;
        return (
          <span
            key={ci}
            ref={ref}
            className={ci < cursorChar ? "text-foreground" : "text-muted-foreground"}
          >
            {char}
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

  // Single, absolutely-positioned caret. Its transform animates between
  // character positions so the | slides forward instead of teleporting.
  const innerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLSpanElement | null>(null);
  const targetSideRef = useRef<"left" | "right">("left");
  const firstMeasureRef = useRef(true);
  const [caret, setCaret] = useState<CaretPos | null>(null);
  const [animate, setAnimate] = useState(false);

  const registerTarget = (el: HTMLSpanElement | null, side: "left" | "right") => {
    targetRef.current = el;
    targetSideRef.current = side;
  };

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const target = targetRef.current;
    if (!inner || !target) {
      setCaret(null);
      firstMeasureRef.current = true;
      setAnimate(false);
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const left =
      (targetSideRef.current === "left" ? r.left : r.right) - innerRect.left;
    const top = r.top - innerRect.top;
    setCaret({ left, top, height: r.height });
    if (firstMeasureRef.current) {
      firstMeasureRef.current = false;
      // Re-enable the transition on the next frame so the very first
      // placement doesn't animate from (0, 0).
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [cursorWord, cursorChar, words]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={innerRef}
        className="relative select-none text-2xl leading-[2.2] font-normal text-muted-foreground tracking-[0.04em] [word-spacing:0.25em] sm:text-3xl sm:leading-[2.3] lg:text-4xl lg:leading-[2.4]"
      >
        {showCaret && caret ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 w-0.5 bg-primary"
            style={{
              height: caret.height * 0.8,
              transform: `translate3d(${caret.left}px, ${caret.top + caret.height * 0.1}px, 0)`,
              transition: animate
                ? "transform 110ms cubic-bezier(.22, 0.8, 0.22, 1)"
                : "none",
              animation: "ft-blink 1s steps(2) infinite",
              willChange: "transform",
            }}
          />
        ) : null}
        {words.map((word, wi) => {
          if (wi < cursorWord) {
            const isErr = errorWords.has(wi);
            return (
              <span
                key={wi}
                className={cn(
                  "text-foreground",
                  isErr &&
                    "text-primary underline decoration-1 underline-offset-[6px]",
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
                  registerTarget={registerTarget}
                />{" "}
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
    </div>
  );
}
