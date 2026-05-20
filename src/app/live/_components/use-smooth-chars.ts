"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothing time-constant — the caret trails the live edge by roughly
 *  this long, gliding to catch up. Small enough to feel live, large
 *  enough to read as smooth typing rather than snapping. */
const TAU_MS = 480;
/** Gap (chars) beyond which we just seek instead of animating — a late
 *  joiner or a fresh run shouldn't scroll through everything. */
const SEEK_GAP = 400;

/** Eases a revealed character count toward `target` every animation
 *  frame, so the spectated caret advances character by character instead
 *  of jumping when a new server snapshot lands. Re-renders only when the
 *  rounded count changes (≈ typing speed, not 60fps). Snaps on a rewind
 *  (new run) or a huge jump (seek / late join). rAF pauses itself when
 *  the tab is hidden, so a backgrounded watch tab does no work. */
export function useSmoothChars(target: number): number {
  const [display, setDisplay] = useState(target);
  const posRef = useRef(target);
  const targetRef = useRef(target);
  const emittedRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(120, now - prev);
      prev = now;
      const t = targetRef.current;
      const gap = t - posRef.current;
      if (t < posRef.current || Math.abs(gap) > SEEK_GAP) {
        posRef.current = t; // rewind or seek → snap
      } else {
        posRef.current += gap * (1 - Math.exp(-dt / TAU_MS));
        if (Math.abs(t - posRef.current) < 0.5) posRef.current = t;
      }
      const rounded = Math.round(posRef.current);
      if (rounded !== emittedRef.current) {
        emittedRef.current = rounded;
        setDisplay(rounded);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return display;
}
