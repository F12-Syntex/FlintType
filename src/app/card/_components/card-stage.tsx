"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fits the fixed-size card (`width` × `height`, e.g. 1500 × 787) into
 *  whatever width the viewport has, by scaling it down with a transform
 *  on this wrapper. The card node itself is never transformed, so the
 *  PNG export (which clones the card node) still renders at its natural
 *  size. Never scales up past 1:1. */
export function CardStage({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={frameRef} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-2xl shadow-float"
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width, height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
