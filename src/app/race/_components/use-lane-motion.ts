"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  isSettled,
  stepLaneMotion,
  type LaneMotion,
  type LaneTarget,
} from "./lane-motion";

/** Drives one lane's stone with a frame loop (see `lane-motion.ts`).
 *  Returns refs for the lane to attach:
 *
 *    travel  the travel area (its width is the distance to the line),
 *    mover   a full-width layer translated by the progress,
 *    spin    the stone's wrapper, rotated as it rolls,
 *    trail   the trail behind the stone, scaled by the progress.
 *
 *  Styles are written straight to the elements, so a race re-renders
 *  nothing per frame. The loop sleeps once the stone has caught up and
 *  wakes on the next update. Reduced motion keeps the glide (it carries
 *  the race) but drops the roll. */
export function useLaneMotion(input: Omit<LaneTarget, "sinceUpdateMs">) {
  const { chars, totalChars, wpm, finished, racing } = input;
  const travel = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  const spin = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const inputRef = useRef(input);
  const changedAt = useRef(0);
  const lastFrame = useRef(0);
  const motion = useRef<LaneMotion | null>(null);
  const raf = useRef(0);
  const wake = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    inputRef.current = input;
  });

  useEffect(() => {
    changedAt.current = performance.now();
  }, [chars]);

  // A layout effect, so the first position lands before the first paint.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = (m: LaneMotion) => {
      if (mover.current) mover.current.style.transform = `translateX(${m.pos * 100}%)`;
      if (trail.current) trail.current.style.transform = `scaleX(${m.pos})`;
      if (spin.current) spin.current.style.transform = `rotate(${m.angle}deg)`;
    };

    const frame = (now: number) => {
      const dt = Math.min(now - lastFrame.current, 100);
      lastFrame.current = now;
      const t: LaneTarget = {
        ...inputRef.current,
        sinceUpdateMs: now - changedAt.current,
      };
      const next = stepLaneMotion(
        motion.current ?? { pos: 0, angle: 0 },
        t,
        dt,
        travel.current?.clientWidth ?? 0,
        spin.current?.offsetWidth ?? 0,
        !reduce.matches,
      );
      motion.current = next;
      apply(next);
      raf.current = isSettled(next, t) ? 0 : requestAnimationFrame(frame);
    };

    wake.current = () => {
      if (raf.current !== 0) return;
      lastFrame.current = performance.now();
      raf.current = requestAnimationFrame(frame);
    };

    // Start where the racer already is, so joining (or remounting)
    // mid-race never replays every stone from the line.
    if (motion.current == null) {
      const t = inputRef.current;
      const pos =
        t.racing && t.totalChars > 0
          ? t.finished
            ? 1
            : Math.min(1, Math.max(0, t.chars / t.totalChars))
          : 0;
      motion.current = { pos, angle: 0 };
    }
    apply(motion.current);
    wake.current();
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, []);

  useEffect(() => {
    wake.current();
  }, [chars, totalChars, wpm, finished, racing]);

  return { travel, mover, spin, trail };
}
