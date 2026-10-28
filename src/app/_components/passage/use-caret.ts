"use client";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { TapeMode } from "@/lib/appearance-prefs";
import type { CaretPos } from "./caret";
import { scrollLines } from "./lines";

/** Single, absolutely-positioned caret. Its transform animates between
 *  character positions so the | slides forward instead of teleporting.
 *
 *  Measures the caret's target letter (registered by the active word
 *  through `registerTarget`) and scrolls the text to keep it in view:
 *  vertically in multi-line mode, horizontally in tape mode. */
export function usePassageCaret({
  outerRef,
  innerRef,
  words,
  cursorWord,
  cursorChar,
  lineHeight,
  clipHeight,
  tapeOn,
  tapeMode,
  tapeMargin,
}: {
  /** The centring column. */
  outerRef: RefObject<HTMLDivElement | null>;
  /** The text itself, inside the viewport. */
  innerRef: RefObject<HTMLDivElement | null>;
  words: readonly string[];
  cursorWord: number;
  cursorChar: number;
  lineHeight: number | null;
  clipHeight: number | null;
  tapeOn: boolean;
  tapeMode: TapeMode;
  /** 0–100, percent from the left edge of the typing area. */
  tapeMargin: number;
}) {
  const targetRef = useRef<HTMLSpanElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const targetSideRef = useRef<"left" | "right">("left");
  const firstMeasureRef = useRef(true);
  const [caret, setCaret] = useState<CaretPos | null>(null);
  const [animate, setAnimate] = useState(false);
  // Translate-up offset on the inner block. Stays at 0 until the cursor
  // crosses line `floor(cap/2)`, then grows by one line-height per line
  // completed past that point — so once you've reached the midline of
  // the visible window, every line you complete reveals a fresh line at
  // the bottom (and the line you just left scrolls off the top). Cursor
  // settles at the midline and stays there for the rest of the run.
  const [scrollOffset, setScrollOffset] = useState(0);
  // Horizontal translate when tape mode is on. Pinned so the cursor
  // (letter mode) or active word (word mode) sits at `tapeMargin%` of
  // the viewport width.
  const [scrollX, setScrollX] = useState(0);

  const registerTarget = (el: HTMLSpanElement | null, side: "left" | "right") => {
    targetRef.current = el;
    targetSideRef.current = side;
  };

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    const target = targetRef.current;
    if (!inner || !outer || !target) {
      setCaret(null);
      setScrollOffset(0);
      setScrollX(0);
      firstMeasureRef.current = true;
      setAnimate(false);
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    // r.top - innerRect.top stays a stable local coordinate even when
    // inner is translated — the transform shifts both rects equally.
    const targetTopInInner = r.top - innerRect.top;
    const targetLeftInInner = r.left - innerRect.left;
    setCaret({
      charLeft: targetLeftInInner,
      charRight: r.right - innerRect.left,
      top: targetTopInInner,
      height: r.height,
      width: r.width,
      side: targetSideRef.current,
    });

    if (tapeOn) {
      // Tape mode — single horizontal line. The cursor stays pinned at
      // `tapeMargin%` of the viewport width; words slide left as the
      // user advances. "letter" tracks the caret's exact x position
      // (per keystroke); "word" tracks the active word's left edge
      // (per word boundary), so the cursor moves freely *within* a
      // word and only the line repositions when a new word starts.
      const viewportWidth = outer.clientWidth;
      const anchor =
        viewportWidth * Math.max(0, Math.min(100, tapeMargin)) / 100;
      let cursorX = targetLeftInInner;
      if (tapeMode === "word") {
        const ws = activeWordRef.current;
        if (ws) {
          const wsRect = ws.getBoundingClientRect();
          cursorX = wsRect.left - innerRect.left;
        }
      }
      // Pin the cursor (letter) / active word (word) at the anchor from
      // the very first keystroke — real tape behaviour. A *negative*
      // scrollX is intentional and correct: it translates the line to
      // the right so the first character sits at the margin with empty
      // space to its left (exactly how Monkeytype's tape opens). The
      // old `Math.max(0, …)` clamp pinned the line flush-left until the
      // cursor had typed past the anchor, so the test didn't scroll at
      // the start — that was the bug.
      setScrollX(cursorX - anchor);
      setScrollOffset(0);
    } else {
      // Multi-line — keep the cursor at the mid-line of the viewport
      // once it's typed past it (cap = the reserved lines), with at
      // least one lookahead line below it; text that fits the
      // reservation never scrolls. See scrollLines (lines.ts).
      setScrollX(0);
      const lh = lineHeight ?? parseFloat(getComputedStyle(inner).lineHeight);
      if (Number.isFinite(lh) && lh > 0 && clipHeight != null && clipHeight > 0) {
        const cap = Math.max(1, Math.round(clipHeight / lh));
        const currentLine = Math.max(0, Math.floor(targetTopInInner / lh));
        const content = Math.round(inner.offsetHeight / lh);
        setScrollOffset(scrollLines(cap, currentLine, content) * lh);
      } else {
        setScrollOffset(0);
      }
    }

    if (firstMeasureRef.current) {
      firstMeasureRef.current = false;
      // Re-enable the transition on the next frame so the very first
      // placement doesn't animate from (0, 0).
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [
    cursorWord,
    cursorChar,
    words,
    clipHeight,
    lineHeight,
    tapeOn,
    tapeMode,
    tapeMargin,
    outerRef,
    innerRef,
  ]);

  return { caret, animate, scrollOffset, scrollX, activeWordRef, registerTarget };
}
