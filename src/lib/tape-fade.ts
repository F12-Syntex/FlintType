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
  // Clamp the right band's start so it never crosses left of the caret
  // anchor: at a high caret margin the fixed `100 - edge` start would put
  // the caret (and the upcoming text) inside the right transparency ramp,
  // rendering them permanently faded / invisible (FT-071). Keep the band
  // a small buffer to the right of the caret.
  const BUFFER = 5;
  const right = Math.max(100 - edge, Math.min(100, margin + BUFFER));
  return `linear-gradient(to right, transparent 0%, #000 ${left}%, #000 ${right}%, transparent 100%)`;
}
