"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useCaretSettings } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

type CaretPos = {
  /** Left edge of the target char (inside the inner block). */
  charLeft: number;
  /** Right edge of the target char (inside the inner block). */
  charRight: number;
  /** Top of the target char (inside the inner block). */
  top: number;
  /** Char height. */
  height: number;
  /** Char width. */
  width: number;
  /** Which side of the char the line-style caret should hug. */
  side: "left" | "right";
};

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
  const { settings: caretSettings } = useCaretSettings();
  const showCaret = phase !== "done" && caretSettings.style !== "off";

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
    setCaret({
      charLeft: r.left - innerRect.left,
      charRight: r.right - innerRect.left,
      top: r.top - innerRect.top,
      height: r.height,
      width: r.width,
      side: targetSideRef.current,
    });
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
          <CaretGlyph
            caret={caret}
            settings={caretSettings}
            animate={animate}
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

/** Renders the caret glyph at the right place for the chosen style. The
 *  five styles split into two groups:
 *    - "line": a slim bar hugging the next-char edge (or right edge of the
 *      last char when sitting at end-of-word). Width = user thickness.
 *    - "block" / "underline" / "outline": always overlay the target char,
 *      so they ignore which side the line-style caret would hug. */
function CaretGlyph({
  caret,
  settings,
  animate,
}: {
  caret: CaretPos;
  settings: {
    style: "line" | "block" | "underline" | "outline" | "off";
    width: number;
    radius: number;
    blinkSpeed: number;
    smoothSpeed: number;
  };
  animate: boolean;
}) {
  const { style, width, radius, blinkSpeed, smoothSpeed } = settings;

  // Position + dimensions per style.
  const lineX = caret.side === "left" ? caret.charLeft : caret.charRight;
  const blockX = caret.charLeft;

  let x = lineX;
  let y = caret.top;
  let w = width;
  let h = caret.height * 0.85;
  let bg = "var(--primary)";
  let border = "transparent";
  const r = `${radius}px`;

  if (style === "line") {
    y = caret.top + caret.height * 0.075;
  } else if (style === "block") {
    x = blockX;
    w = caret.width;
    h = caret.height;
    bg = "color-mix(in oklch, var(--primary) 35%, transparent)";
  } else if (style === "underline") {
    x = blockX;
    w = caret.width;
    h = width;
    y = caret.top + caret.height - width;
  } else if (style === "outline") {
    x = blockX;
    w = caret.width;
    h = caret.height;
    bg = "transparent";
    border = "var(--primary)";
  }

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 left-0"
      style={{
        width: w,
        height: h,
        backgroundColor: bg,
        border:
          style === "outline" ? `${width}px solid ${border}` : undefined,
        borderRadius: r,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition:
          animate && smoothSpeed > 0
            ? `transform ${smoothSpeed}ms cubic-bezier(.22, 0.8, 0.22, 1)`
            : "none",
        animation:
          blinkSpeed > 0
            ? `ft-blink ${blinkSpeed}ms steps(2) infinite`
            : undefined,
        willChange: "transform",
      }}
    />
  );
}
