"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { type CaretStyle, useCaretSettings } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import type { AttemptOutcome } from "./burst-reducer";

/** The big central word. Untyped chars paint with the practice
 *  passage's untyped colour, typed chars with the typed colour,
 *  mistyped with the error colour - same CSS variables the practice
 *  surface uses so a colour pick on the customise page propagates
 *  here. The word as a whole tints to the outcome on a finished
 *  attempt; while `ready` (waiting for space to commit) the whole
 *  word turns primary.
 *
 *  Long pangrams wrap to as many lines as needed; the size scales
 *  down on narrow viewports so even an eight-word sentence fits at
 *  375 px without horizontal scroll.
 *
 *  The user's caret style / width / radius / blink speed all apply,
 *  via an absolutely-positioned <CaretGlyph> measured against the
 *  next-to-type char. */
export function BurstWord({
  target,
  typed,
  outcome,
  ready,
}: {
  target: string;
  typed: string;
  outcome: AttemptOutcome | null;
  ready: boolean;
}) {
  const { settings: caret } = useCaretSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [caretRect, setCaretRect] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || caret.style === 'off') {
      setCaretRect(null);
      return;
    }
    const cursorIdx =
      typed.length < target.length ? typed.length : target.length - 1;
    const charEl = el.querySelectorAll<HTMLSpanElement>('[data-char]')[cursorIdx];
    if (!charEl) {
      setCaretRect(null);
      return;
    }
    const wrap = el.getBoundingClientRect();
    const r = charEl.getBoundingClientRect();
    setCaretRect({
      left: r.left - wrap.left,
      top: r.top - wrap.top,
      w: r.width,
      h: r.height,
    });
  }, [typed.length, target, caret.style]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative max-w-full select-none break-words text-center font-mono font-extrabold tracking-tight transition-colors duration-200',
        'text-balance text-3xl leading-tight sm:text-4xl lg:text-5xl',
        outcome === 'win' && 'text-primary',
        outcome === 'slow' && 'text-muted-foreground',
        outcome === 'wrong' && 'text-destructive',
        ready && outcome == null && 'text-primary',
      )}
      style={{ fontFamily: 'var(--ft-font-family, inherit)' }}
    >
      {[...target].map((ch, i) => {
        const t = typed[i];
        let color: string;
        if (t === undefined) {
          color = 'var(--ft-passage-untyped, var(--muted-foreground))';
        } else if (t === ch) {
          color = 'var(--ft-passage-typed, var(--foreground))';
        } else {
          color = 'var(--ft-passage-error, var(--destructive))';
        }
        const isCursor = i === typed.length;
        const blockOnActive =
          caret.style === 'block' && isCursor && outcome == null;
        return (
          <span
            key={i}
            data-char
            style={
              blockOnActive
                ? {
                    color,
                    backgroundColor:
                      'color-mix(in oklch, var(--primary) 35%, transparent)',
                    borderRadius: caret.radius,
                  }
                : { color }
            }
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
      {caretRect && caret.style !== 'off' && outcome == null ? (
        <CaretGlyph
          rect={caretRect}
          style={caret.style}
          width={caret.width}
          radius={caret.radius}
          blinkSpeed={caret.blinkSpeed}
          atEnd={typed.length >= target.length}
        />
      ) : null}
    </div>
  );
}

/** Static-position caret painted absolutely over the active char.
 *  Mirrors the practice CaretShape: line / underline / outline. The
 *  block style is drawn inline by the parent (it tints the char's
 *  background directly so the letter remains readable on top of the
 *  highlight). */
function CaretGlyph({
  rect,
  style,
  width,
  radius,
  blinkSpeed,
  atEnd,
}: {
  rect: { left: number; top: number; w: number; h: number };
  style: CaretStyle;
  width: number;
  radius: number;
  blinkSpeed: number;
  atEnd: boolean;
}) {
  if (style === 'off' || style === 'block') return null;
  const blinkClass = blinkSpeed > 0 ? 'ft-caret-blink' : '';
  const blinkVar = {
    ['--ft-blink-speed' as string]: `${blinkSpeed}ms`,
  } as CSSProperties;
  const base: CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundColor: 'var(--primary)',
    borderRadius: radius,
    ...blinkVar,
  };
  if (style === 'line') {
    const left = atEnd ? rect.left + rect.w : rect.left;
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...base,
          left,
          top: rect.top + (rect.h - rect.h * 0.85) / 2,
          width,
          height: rect.h * 0.85,
        }}
      />
    );
  }
  if (style === 'underline') {
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...base,
          left: rect.left,
          top: rect.top + rect.h - width,
          width: rect.w,
          height: width,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={blinkClass}
      style={{
        ...base,
        left: rect.left,
        top: rect.top,
        width: rect.w,
        height: rect.h,
        backgroundColor: 'transparent',
        border: `${width}px solid var(--primary)`,
      }}
    />
  );
}
