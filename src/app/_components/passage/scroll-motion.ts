import type { TapeMode } from "@/lib/appearance-prefs";

/** Smooth scroll is honoured in every mode when the user has it on,
 *  but ONLY while a run is in progress. At rest the line snaps to its
 *  resting position with no transition — so a fresh passage (first
 *  paint, or after a restart) spawns already centred at the tape anchor
 *  instead of sliding in from wherever the previous run had scrolled
 *  to. (Restart keeps the active-word target mounted, so the usual
 *  first-measure reset doesn't fire; gating on phase is what makes the
 *  spawn instant.)
 *  The transition *duration* adapts to the cadence of the moves:
 *    - multi-line / word-tape reposition once every several keystrokes,
 *      so a longer glide (220ms multi-line, 240ms word tape) reads as a
 *      clear "next line / next word" slide.
 *    - letter-tape nudges the line on every keypress, so it uses a
 *      shorter 190ms linear glide that keeps up with fast typing and
 *      tracks the cursor smoothly instead of smearing (a long glide
 *      there would visibly lag behind the caret).
 *  The caret glyph's own transform transition is matched to this
 *  duration in tape mode (see CaretGlyph `transformDurationMs`) so the
 *  pinned caret and the sliding text move in lockstep — otherwise the
 *  caret wobbles around the anchor while the two animations race. */
export function passageScrollMotion({
  smoothLineScroll,
  running,
  tapeOn,
  tapeMode,
}: {
  smoothLineScroll: boolean;
  /** phase === "running". */
  running: boolean;
  tapeOn: boolean;
  tapeMode: TapeMode;
}): { animateScroll: boolean; scrollDurationMs: number; scrollEase: string } {
  const animateScroll = smoothLineScroll && running;
  // Tape scroll glides at a CONSTANT velocity (linear) so consecutive
  // per-keystroke nudges blend into one continuous slide — an ease-out
  // curve front-loads each nudge and re-accelerates from rest every
  // keystroke, which reads as fast + juttery rather than smooth. The
  // multi-line vertical scroll keeps the ease-out "next line" slide
  // (a discrete jump every few keystrokes, where a decelerating glide
  // reads well). Tape durations are a touch longer so the motion is a
  // visible smooth glide, not an instant snap; the caret matches it
  // (CaretGlyph's transformDurationMs) so the two stay in lockstep.
  const scrollDurationMs = !tapeOn ? 220 : tapeMode === "letter" ? 190 : 240;
  const scrollEase = tapeOn ? "linear" : "cubic-bezier(0.16, 1, 0.3, 1)";
  return { animateScroll, scrollDurationMs, scrollEase };
}
