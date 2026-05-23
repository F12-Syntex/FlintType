import type { TapeFade } from "./appearance-prefs";

/** Build the horizontal opacity-mask gradient for the tape line, or
 *  `null` when fade is off.
 *
 *  The caret is pinned at `marginPct`% of the viewport, so the left fade
 *  is **clamped to the margin**: the receding typed history dissolves to
 *  the left, but the gradient is fully opaque by the caret, keeping the
 *  caret and the text right of it crisp. The far-right edge also fades so
 *  upcoming text dissolves into the run instead of hitting a hard clip.
 *  `strong` fades a wider band (20%) than `soft` (9%). Opacity only — no
 *  colour — so the tape stays paper-and-ink. */
export function tapeFadeMask(fade: TapeFade, marginPct: number): string | null {
  if (fade === "off") return null;
  const edge = fade === "strong" ? 20 : 9;
  const margin = Math.max(0, Math.min(100, marginPct));
  const left = Math.min(margin, edge);
  return `linear-gradient(to right, transparent 0%, #000 ${left}%, #000 ${100 - edge}%, transparent 100%)`;
}
