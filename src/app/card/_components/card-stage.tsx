"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Fits the fixed-size card (`width` × `height`, e.g. 1500 × 787) into
 *  whatever width the viewport has, by scaling it down with a transform
 *  on this wrapper. The card node itself is never transformed, so the
 *  PNG export (which clones the card node) still renders at its natural
 *  size. Never scales up past 1:1.
 *
 *  The frame reserves the card's final box from the very first paint
 *  (full width, the card's aspect ratio, clipped), so there's no
 *  horizontal scroll or layout shift before hydration. The card stays
 *  hidden until it has been measured and scaled, so it never flashes at
 *  natural size inside the frame. */
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
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    // The observer reports the frame's size as soon as it starts
    // observing (before paint), then again on every resize.
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div
      ref={frameRef}
      className="relative mx-auto w-full overflow-hidden rounded-2xl shadow-float"
      style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width,
          height,
          transform: `scale(${scale ?? 1})`,
          visibility: scale == null ? "hidden" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
