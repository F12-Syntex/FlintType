import type { CSSProperties } from "react";
import type { TaperMode, TaperStrength } from "./appearance-prefs";

/** Per-variant + per-strength taper coefficients. `unit` × `distance`
 *  produces the effect magnitude; `floor` caps the falloff so words
 *  far from the cursor still register as part of the passage rather
 *  than disappearing. Constants tuned by feel — soft barely-there,
 *  strong clearly emphasises the active word. */
const COEFFICIENTS = {
  opacity: {
    soft: { unit: 0.05, floor: 0.6 },
    medium: { unit: 0.08, floor: 0.4 },
    strong: { unit: 0.12, floor: 0.25 },
  },
  size: {
    soft: { unit: 0.015, floor: 0.92 },
    medium: { unit: 0.025, floor: 0.85 },
    strong: { unit: 0.04, floor: 0.75 },
  },
  blur: {
    // unit = px per unit-distance; ceiling = max blur
    soft: { unit: 0.1, ceiling: 0.6 },
    medium: { unit: 0.2, ceiling: 1.2 },
    strong: { unit: 0.35, ceiling: 2 },
  },
  mute: {
    // mix percentage (0–100) of muted-foreground blended into the
    // current colour; higher = closer to muted.
    soft: { unit: 5, ceiling: 40 },
    medium: { unit: 8, ceiling: 60 },
    strong: { unit: 12, ceiling: 80 },
  },
} as const satisfies Record<
  Exclude<TaperMode, "off">,
  Record<TaperStrength, Record<string, number>>
>;

/** Compute the CSS style to apply to a word at `distance` units away
 *  from the active word. `distance` is `Math.abs(wordIdx - cursorWord)`
 *  — symmetric, so the same word fades in either direction. Returns
 *  `undefined` for the off variant so the caller can spread without
 *  cluttering output. */
export function taperStyle(
  distance: number,
  mode: TaperMode,
  strength: TaperStrength,
): CSSProperties | undefined {
  if (mode === "off") return undefined;
  const d = Math.max(0, Math.floor(distance));
  if (d === 0) return undefined;
  if (mode === "opacity") {
    const c = COEFFICIENTS.opacity[strength];
    return { opacity: Math.max(c.floor, 1 - c.unit * d) };
  }
  if (mode === "size") {
    const c = COEFFICIENTS.size[strength];
    return {
      fontSize: `${Math.max(c.floor, 1 - c.unit * d).toFixed(3)}em`,
    };
  }
  if (mode === "blur") {
    const c = COEFFICIENTS.blur[strength];
    const px = Math.min(c.ceiling, c.unit * d);
    return { filter: `blur(${px.toFixed(2)}px)` };
  }
  if (mode === "mute") {
    const c = COEFFICIENTS.mute[strength];
    const mix = Math.min(c.ceiling, c.unit * d);
    return {
      color: `color-mix(in oklch, var(--muted-foreground) ${mix}%, currentColor)`,
    };
  }
  return undefined;
}
