import type { TapeFade } from "./appearance-prefs";

/** Few % of opaque headroom kept to the right of the caret so a handful
 *  of upcoming characters stay crisp even when the caret-position slider
 *  is pushed near the right edge. */
const RIGHT_BUFFER = 5;

/** Build the horizontal opacity-mask gradient for the tape line, or
 *  `null` when fade is off.
 *
 *  The caret is pinned at `marginPct`% of the viewport, so **both** fades
 *  are clamped to keep the caret + upcoming text crisp:
 *   - the left fade stops at the margin, so the receding typed history
 *     dissolves to the left but is fully opaque by the caret;
 *   - the right fade only begins a few % past the caret. Without this
 *     clamp a high caret position (slider ~80–100%) drops the caret and
 *     the active/upcoming text into the right transparency ramp —
 *     permanently faded, fully invisible at margin 100 (FT-071). The
 *     right fade therefore only engages when there's honest room for it
 *     (low/medium margins).
 *  `strong` fades a wider band (20%) than `soft` (9%). Opacity only — no
 *  colour — so the tape stays paper-and-ink. */
export function tapeFadeMask(fade: TapeFade, marginPct: number): string | null {
  if (fade === "off") return null;
  const edge = fade === "strong" ? 20 : 9;
  const margin = Math.max(0, Math.min(100, marginPct));
  const left = Math.min(margin, edge);
  const right = Math.max(100 - edge, Math.min(100, margin + RIGHT_BUFFER));
  return `linear-gradient(to right, transparent 0%, #000 ${left}%, #000 ${right}%, transparent 100%)`;
}
