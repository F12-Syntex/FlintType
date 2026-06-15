/** Pointer-edge "peek" maths for the auto-hide chrome (ui-law §15).
 *
 *  While a run is active and `autoHide` is dim/fade, the topbar/footer are
 *  hidden. The user peeks them back by moving the pointer to a viewport edge.
 *  CSS `:hover` can't drive this — under `fade` the chrome is
 *  `pointer-events: none` and never hit-tested — so AutoHideApplier reads the
 *  pointer position and mirrors the result onto `<html data-ft-peek>`. */

/** Distance from a viewport edge (px) within which the pointer counts as
 *  peeking the chrome back. Roughly one topbar height. */
export const PEEK_EDGE_PX = 56;

/** Which auto-hidden strip the pointer is peeking, from its viewport Y:
 *  `"top"` near the top edge (the topbar), `"bottom"` near the bottom (the
 *  footer), or `null` in between (chrome stays hidden). The top edge wins when
 *  the two zones overlap on a very short viewport. Kept pure so the applier is
 *  a thin shell and the zone maths is unit-tested. */
export function peekEdge(
  clientY: number,
  viewportHeight: number,
  edge: number = PEEK_EDGE_PX,
): "top" | "bottom" | null {
  if (clientY <= edge) return "top";
  if (clientY >= viewportHeight - edge) return "bottom";
  return null;
}
