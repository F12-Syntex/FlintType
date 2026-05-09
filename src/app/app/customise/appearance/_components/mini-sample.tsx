"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useCaretSettings } from "@/lib/caret-settings";

/** A small, **live** preview of a typing test surface. Every theme
 *  variable, caret setting, typography preference, and appearance pref
 *  paints into this one card — so wherever it's mounted, the user sees
 *  exactly what their override does to the practice text.
 *
 *  Composition:
 *    - typed / untyped / error letter spans (paint with `--ft-passage-*`
 *      tokens, falling back to `--primary`, `--muted-foreground`,
 *      `--destructive` so colour rows reflect immediately)
 *    - a static caret rendered through the same CaretShape primitive
 *      the real passage uses (style, thickness, radius — no blink, the
 *      preview is intentionally still per the §13 reduced-motion
 *      guidance)
 *    - a small "60 wpm · 96 acc" stat strip painted with the user's
 *      live-stats colour + opacity
 *    - a primary button + accent chip + outlined card so colour rows
 *      that don't touch the passage (--accent, --muted, --border, --ring)
 *      still have a visible target
 *    - all surfaces honour `--radius` via Tailwind utilities, so the
 *      Geometry section's preview moves in lockstep with the override
 *
 *  No animation. The preview is a static snapshot — every option is
 *  visible without anything having to move. */
export function MiniSample({
  /** Override sample text; defaults to a pangram that exercises every
   *  glyph the user is likely to type. */
  text = "the quick brown fox jumps over the lazy dog",
  /** How many letters of `text` are "typed" (painted with the typed
   *  colour). The next character gets the caret; the rest are untyped.
   *  One letter is intentionally rendered as an error so the error
   *  colour is always visible. */
  typedCount = 8,
  /** Index of the letter painted as an error. Must be < typedCount. */
  errorAt = 4,
}: {
  text?: string;
  typedCount?: number;
  errorAt?: number;
}) {
  const { settings: caret } = useCaretSettings();
  const { prefs } = useAppearancePrefs();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const idx = Math.min(typedCount, text.length - 1);
    const charEl = wrap.querySelectorAll<HTMLSpanElement>("[data-char]")[idx];
    if (!charEl) return;
    const wrapRect = wrap.getBoundingClientRect();
    const r = charEl.getBoundingClientRect();
    setTarget({
      left: r.left - wrapRect.left,
      top: r.top - wrapRect.top,
      w: r.width,
      h: r.height,
    });
    // Re-measure when fonts swap in or the user resizes/zooms.
  }, [typedCount, text]);

  const liveColor = prefs.liveStatsColor || "var(--primary)";
  const liveOpacity = prefs.liveStatsOpacity ?? 1;

  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
      {/* Live stats strip — paints in the user's chosen live-stats
          colour at the chosen opacity. Mirrors the real run-time
          surface; this is the ONLY place outside the active test where
          those tokens are visible. */}
      <div
        className="flex items-baseline gap-4 font-mono text-xs uppercase tracking-[0.18em]"
        style={{ color: liveColor, opacity: liveOpacity }}
      >
        <span>30s</span>
        <span className="tabular-nums">60 wpm</span>
        <span className="tabular-nums">96 acc</span>
      </div>

      {/* The passage. Variables wired the same way as src/app/app/_components/passage.tsx
          so a change to --ft-font-* / --ft-passage-* shows up here too. */}
      <div className="rounded-md border border-border bg-card px-4 py-4">
        <div
          ref={containerRef}
          className="relative font-mono leading-[1.6]"
          style={{
            fontFamily: "var(--ft-font-family, inherit)",
            fontSize: "calc(var(--ft-font-scale, 1) * 1.125rem)",
            wordSpacing: "var(--ft-word-spacing, 0.25em)",
          }}
        >
          {[...text].map((ch, i) => {
            let color = "var(--ft-passage-untyped, var(--muted-foreground))";
            if (i < typedCount) {
              color =
                i === errorAt
                  ? "var(--ft-passage-error, var(--destructive))"
                  : "var(--ft-passage-typed, var(--primary))";
            }
            return (
              <span
                key={i}
                data-char
                style={{
                  color,
                  textDecoration: i === errorAt ? "underline" : undefined,
                  textDecorationColor:
                    i === errorAt
                      ? "var(--ft-passage-error, var(--destructive))"
                      : undefined,
                  textUnderlineOffset: i === errorAt ? "4px" : undefined,
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
          {target && caret.style !== "off" ? (
            <CaretGlyph caret={caret} target={target} />
          ) : null}
        </div>
      </div>

      {/* Component strip — primary button, accent chip, outlined card
          so colours that don't touch the passage still have a target. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium uppercase tracking-[0.14em] text-primary-foreground"
        >
          Start test
        </button>
        <span className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs font-medium uppercase tracking-[0.14em] text-accent-foreground">
          30s · words
        </span>
        <span className="inline-flex h-8 items-center rounded-md border border-border bg-muted px-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          quotes
        </span>
        <span
          className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium uppercase tracking-[0.14em] ring-2 ring-ring ring-offset-2 ring-offset-background text-foreground"
        >
          focused
        </span>
      </div>
    </div>
  );
}

/** Static caret — same shape primitive the real passage's CaretShape
 *  uses, but no blink animation. The user's chosen style/width/radius
 *  are honoured so the Caret section's preview reflects every option. */
function CaretGlyph({
  caret,
  target,
}: {
  caret: { style: string; width: number; radius: number };
  target: { left: number; top: number; w: number; h: number };
}) {
  const { style, width, radius } = caret;
  const base: React.CSSProperties = {
    position: "absolute",
    backgroundColor: "var(--primary)",
    borderRadius: radius,
    pointerEvents: "none",
  };
  if (style === "line") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: target.left,
          top: target.top + (target.h - target.h * 0.85) / 2,
          width,
          height: target.h * 0.85,
        }}
      />
    );
  }
  if (style === "block") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: target.left,
          top: target.top,
          width: target.w,
          height: target.h,
          backgroundColor:
            "color-mix(in oklch, var(--primary) 35%, transparent)",
        }}
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: target.left,
          top: target.top + target.h - width,
          width: target.w,
          height: width,
        }}
      />
    );
  }
  // outline
  return (
    <span
      aria-hidden
      style={{
        ...base,
        left: target.left,
        top: target.top,
        width: target.w,
        height: target.h,
        backgroundColor: "transparent",
        border: `${width}px solid var(--primary)`,
      }}
    />
  );
}
