import { cn } from "@/lib/utils";

export type CaretPos = {
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

/** Renders the caret glyph at the right place for the chosen style. The
 *  five styles split into two groups:
 *    - "line": a slim bar hugging the next-char edge (or right edge of the
 *      last char when sitting at end-of-word). Width = user thickness.
 *    - "block" / "underline" / "outline": always overlay the target char,
 *      so they ignore which side the line-style caret would hug. */
export function CaretGlyph({
  caret,
  settings,
  animate,
  idle,
  transformDurationMs,
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
  /** When true (phase==="rest" + appearance.caretIdle==="pulse"), the
   *  caret softly pulses ~1Hz so the user sees where typing will
   *  start on a bare bg. CSS keyframe lives in globals.css §15. */
  idle: boolean;
  /** Tape mode override for the *transform* (position) transition,
   *  in ms. When set, it replaces the caret's own smoothSpeed for the
   *  horizontal glide so the pinned caret tracks the sliding text in
   *  lockstep (`0` = snap). Width/height keep smoothSpeed. Undefined
   *  outside tape mode → the caret animates on its own smoothSpeed. */
  transformDurationMs?: number;
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
      data-ft-caret-idle={idle ? "pulse" : undefined}
      className={cn(
        "pointer-events-none absolute top-0 left-0",
        // Class-based blink so per-keystroke re-renders don't restart
        // the animation (would never reach the hidden half otherwise).
        blinkSpeed > 0 && !idle && "ft-caret-blink",
      )}
      style={{
        width: w,
        height: h,
        backgroundColor: bg,
        border:
          style === "outline" ? `${width}px solid ${border}` : undefined,
        borderRadius: r,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: (() => {
          const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
          // Position glide: tape mode locks it to the scroll duration;
          // elsewhere it's the caret's own smoothSpeed (gated on animate).
          const tMs =
            transformDurationMs ?? (animate && smoothSpeed > 0 ? smoothSpeed : 0);
          // In tape mode (transformDurationMs set) the caret rides with
          // the line, which now glides linearly — match it so the pinned
          // caret tracks the constant-velocity scroll instead of wobbling.
          const transformEase = transformDurationMs != null ? "linear" : ease;
          const parts: string[] = [];
          if (tMs > 0) parts.push(`transform ${tMs}ms ${transformEase}`);
          // Width/height (block/underline caret resizing per char) keep
          // the caret's own smoothSpeed regardless of tape mode.
          if (animate && smoothSpeed > 0) {
            parts.push(`width ${smoothSpeed}ms ${ease}`, `height ${smoothSpeed}ms ${ease}`);
          }
          return parts.length > 0 ? parts.join(", ") : "none";
        })(),
        ["--ft-blink-speed" as string]: `${blinkSpeed}ms`,
        willChange: "transform",
      }}
    />
  );
}
