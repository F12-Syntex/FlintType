"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// PB celebration for the result screen's headline speed: a crown that
// pops in beside the number and a one-shot CSS confetti burst. Both
// animations sit behind motion-safe; reduced-motion users get the
// static crown only.

/** Crown badge that sits to the right of the stat value on a new PB.
 *  Inline-positioned so it shares the value's baseline — no absolute
 *  positioning to collide with the digits. Pops in on mount under
 *  motion-safe; reduced-motion users see the rest pose. */
export function PbCrown() {
  return (
    <span
      aria-label="New personal best"
      className={cn(
        "ml-1 inline-flex items-center self-center text-primary",
        "motion-safe:animate-[pb-crown-pop_700ms_cubic-bezier(0.16,1,0.3,1)_both]",
      )}
    >
      <Crown
        strokeWidth={2.25}
        className="size-8 sm:size-10"
        aria-hidden
      />
    </span>
  );
}

/** Confetti burst that fires once when the user lands a new PB.
 *  Pure CSS — 24 thin rectangles fan out from the stat origin at
 *  pre-baked angles, drop under "gravity" via a `dy` offset, and
 *  fade out as they rotate. Each piece's end position is encoded as
 *  CSS variables (--burst-dx / --burst-dy) so the shared
 *  `pb-confetti` keyframe (in globals.css) interpolates from origin
 *  to a final point without trig functions. Hidden under
 *  prefers-reduced-motion via the `motion-safe:` prefix on the
 *  animation class. */
export function PbConfetti() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 size-0"
    >
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 left-0 block opacity-0 motion-safe:animate-[pb-confetti_1200ms_cubic-bezier(0.22,0.61,0.36,1)_forwards]"
          style={
            {
              ["--burst-dx"]: `${p.dx}px`,
              ["--burst-dy"]: `${p.dy}px`,
              ["--burst-rotate"]: `${p.rotate}deg`,
              width: `${p.w}px`,
              height: `${p.h}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Confetti is deterministic — pre-baked once at module load so each
 *  burst is identical (no SSR/client jitter, no per-render reshuffle).
 *  Two layers: a wide initial spray angled mostly upward, a slower
 *  trickle of larger pieces. Colours pull from the brand-accent set
 *  via `var(--primary)`, the accent foreground, and a couple of
 *  warm-paper highlights so the burst doesn't read as a single-hue
 *  glow. */
type ConfettiPiece = {
  dx: number;
  dy: number;
  rotate: number;
  w: number;
  h: number;
  color: string;
  delay: number;
};
const CONFETTI_PIECES: readonly ConfettiPiece[] = (() => {
  const COUNT = 24;
  const COLORS = [
    "var(--primary)",
    "var(--primary)",
    "color-mix(in oklch, var(--primary) 60%, var(--foreground))",
    "color-mix(in oklch, var(--primary) 55%, white)",
    "var(--accent-foreground)",
  ];
  const out: ConfettiPiece[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    // Upper hemisphere only (angle 200°-340°) so confetti shoots up
    // and outward like a real party popper, then arcs back down via
    // the +dy gravity addition. Mirror the index to keep distribution
    // even on both sides of the stat.
    const t = i / COUNT;
    const angleDeg = 200 + t * 140 + (i % 2 === 0 ? -8 : 8);
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = 70 + ((i * 13) % 40);
    const gravity = 60 + ((i * 7) % 40);
    out.push({
      dx: Math.round(Math.cos(angleRad) * distance),
      dy: Math.round(Math.sin(angleRad) * distance + gravity),
      rotate: 360 + ((i * 47) % 360),
      w: 4 + ((i * 3) % 4),
      h: 8 + ((i * 5) % 6),
      color: COLORS[i % COLORS.length]!,
      delay: (i * 14) % 120,
    });
  }
  return out;
})();
