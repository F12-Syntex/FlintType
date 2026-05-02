"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

/** How many text lines stay visible at once. */
const VISIBLE_LINES = 3;
/** Slide the window forward when the cursor lands this many lines into
 *  the visible window (i.e. once the lines above have been completed). */
const SLIDE_TRIGGER_LINE = 2;

type LineLayout = {
  /** offsetTop in px for the start of each line. */
  lineTops: number[];
  /** Line height in px (median of consecutive top deltas). */
  lineHeight: number;
  /** wordIndex → lineIndex. */
  lineOf: number[];
};

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
  blind,
}: {
  word: string;
  cursorChar: number;
  registerTarget: (el: HTMLSpanElement | null, side: "left" | "right") => void;
  blind: boolean;
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
            className={
              blind
                ? "text-muted-foreground"
                : ci < cursorChar
                  ? "text-foreground"
                  : "text-muted-foreground"
            }
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
  const { prefs } = useBehaviourPrefs();
  const blind = prefs.blindMode;
  const showCaret = phase !== "done" && caretSettings.style !== "off";

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLSpanElement | null>(null);
  const targetSideRef = useRef<"left" | "right">("left");
  const firstMeasureRef = useRef(true);
  const [caret, setCaret] = useState<CaretPos | null>(null);
  const [animate, setAnimate] = useState(false);
  const [layout, setLayout] = useState<LineLayout | null>(null);
  const [viewStartLine, setViewStartLine] = useState(0);

  const registerTarget = (el: HTMLSpanElement | null, side: "left" | "right") => {
    targetRef.current = el;
    targetSideRef.current = side;
  };

  // Reset the visible window when the passage itself changes (new run).
  useEffect(() => {
    setViewStartLine(0);
  }, [words]);

  // Measure word positions → group into lines. Re-runs when words change
  // or the inner block resizes (font size / viewport / word-spacing).
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => {
      const wordEls = inner.querySelectorAll<HTMLElement>("[data-word]");
      if (wordEls.length === 0) {
        setLayout(null);
        return;
      }
      const tops: number[] = [];
      const lineOf: number[] = [];
      wordEls.forEach((el) => {
        const wi = Number(el.dataset.word);
        const top = el.offsetTop;
        let lineIdx = tops.indexOf(top);
        if (lineIdx === -1) {
          lineIdx = tops.length;
          tops.push(top);
        }
        lineOf[wi] = lineIdx;
      });
      // Use the median delta between consecutive line tops as the line
      // height. Constant across the passage in practice; the median is
      // just defensive against rounding.
      const deltas: number[] = [];
      for (let i = 1; i < tops.length; i += 1) {
        deltas.push(tops[i]! - tops[i - 1]!);
      }
      deltas.sort((a, b) => a - b);
      const lineHeight =
        deltas.length > 0
          ? deltas[Math.floor(deltas.length / 2)]!
          : inner.getBoundingClientRect().height;
      setLayout((prev) => {
        if (
          prev &&
          prev.lineHeight === lineHeight &&
          prev.lineOf.length === lineOf.length &&
          prev.lineOf.every((v, i) => v === lineOf[i]) &&
          prev.lineTops.length === tops.length &&
          prev.lineTops.every((v, i) => v === tops[i])
        ) {
          return prev;
        }
        return { lineTops: tops, lineHeight, lineOf };
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [words]);

  // Slide the visible window: when the cursor reaches the trigger line
  // inside the current window, advance the window so the cursor lands
  // back at line 0 of a fresh 3-line view.
  useEffect(() => {
    if (!layout) return;
    const cursorLine = layout.lineOf[cursorWord];
    if (cursorLine == null) return;
    if (cursorLine - viewStartLine >= SLIDE_TRIGGER_LINE) {
      setViewStartLine(cursorLine);
    } else if (cursorLine < viewStartLine) {
      // Cursor walked backwards (backspace into prior word) — keep it in
      // view rather than leaving it scrolled off.
      setViewStartLine(cursorLine);
    }
  }, [cursorWord, layout, viewStartLine]);

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
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [cursorWord, cursorChar, words, viewStartLine]);

  const lineHeight = layout?.lineHeight ?? null;
  const wrapperHeight =
    lineHeight != null ? `${lineHeight * VISIBLE_LINES}px` : undefined;
  const translateY =
    layout && layout.lineTops[viewStartLine] != null
      ? -layout.lineTops[viewStartLine]!
      : 0;

  return (
    <div className="w-full">
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden"
        style={{ height: wrapperHeight }}
      >
      <div
        ref={innerRef}
        className="relative select-none text-2xl leading-[2.2] font-normal text-muted-foreground tracking-[0.04em] sm:text-3xl sm:leading-[2.3] lg:text-4xl lg:leading-[2.4]"
        style={{
          wordSpacing: "var(--ft-word-spacing, 0.25em)",
          transform: `translateY(${translateY}px)`,
          transition: "transform 240ms cubic-bezier(.22, 0.8, 0.22, 1)",
          willChange: "transform",
        }}
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
                data-word={wi}
                className={cn(
                  blind ? "text-muted-foreground" : "text-foreground",
                  !blind &&
                    isErr &&
                    "text-primary underline decoration-1 underline-offset-[6px]",
                )}
              >
                {word}
                {" "}
              </span>
            );
          }
          if (wi === cursorWord) {
            return (
              <span key={wi} data-word={wi}>
                <ActiveWord
                  word={word}
                  cursorChar={cursorChar}
                  registerTarget={registerTarget}
                  blind={blind}
                />
                {" "}
              </span>
            );
          }
          return (
            <span
              key={wi}
              data-word={wi}
              className="text-muted-foreground"
            >
              {word}
              {" "}
            </span>
          );
        })}
      </div>
      </div>
      {state.mode === "QUOTE" && state.quoteSource ? (
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          — {state.quoteSource}
        </p>
      ) : null}
      {state.mode === "QUOTE" && words.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          loading quote…
        </p>
      ) : null}
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
      className={cn(
        "pointer-events-none absolute top-0 left-0",
        // Class-based blink so per-keystroke re-renders don't restart
        // the animation (would never reach the hidden half otherwise).
        blinkSpeed > 0 && "ft-caret-blink",
      )}
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
        ["--ft-blink-speed" as string]: `${blinkSpeed}ms`,
        willChange: "transform",
      }}
    />
  );
}
