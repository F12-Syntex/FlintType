"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Render `children` at a fixed design size and scale the whole block to
 *  fit its container on *both* axes, centred — so the full surface is
 *  always visible with no scrollbar, however small the pane. Pure visual
 *  transform: the design box keeps its intrinsic layout, we just shrink
 *  what the user sees. */
export function FitBox({
  designWidth,
  designHeight,
  children,
}: {
  designWidth: number;
  designHeight: number;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const measure = () => {
      const w = outer.clientWidth;
      const h = outer.clientHeight;
      if (!w || !h) return;
      setScale(Math.min(w / designWidth, h / designHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [designWidth, designHeight]);

  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: designWidth,
          height: designHeight,
          transform: `translate(-50%, -50%) scale(${scale || 0})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
