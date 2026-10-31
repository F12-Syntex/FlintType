/** How long each step of the settings import stays on screen. A step
 *  turns done only once its own work has finished; these minimums only
 *  slow how fast that is shown, so each step can be read (ui-law §13).
 *  Under reduced motion every one of them is 0. Pure. */

/** A check step shows its spinner for at least this long. */
export const CHECK_STEP_MIN_MS = 360;
/** The pause after the last step, before the next screen. */
export const STAGE_SETTLE_MS = 300;
/** The import steps share about this long between them. */
const APPLY_TOTAL_MS = 1200;
/** After a sign-out or account switch in the pause before Done, the
 *  longest the import waits to hear whether its save landed. Not motion,
 *  so reduced motion keeps it; Done itself never waits on the save. */
export const SAVE_WAIT_MS = 1200;

export type Timing = {
  checkStepMs: number;
  settleMs: number;
  applyStepMs: (groups: number) => number;
};

/** Each import step's share: 120 to 240 ms, about 1.2 s in all. */
export function applyStepMs(groups: number): number {
  if (groups <= 0) return 0;
  return Math.min(240, Math.max(120, Math.round(APPLY_TOTAL_MS / groups)));
}

export function timingFor(reducedMotion: boolean): Timing {
  return reducedMotion
    ? { checkStepMs: 0, settleMs: 0, applyStepMs: () => 0 }
    : { checkStepMs: CHECK_STEP_MIN_MS, settleMs: STAGE_SETTLE_MS, applyStepMs };
}

/** What is left of a step's minimum once its work took `elapsed` ms. */
export function dwellLeft(minMs: number, elapsedMs: number): number {
  return Math.max(0, Math.round(minMs - elapsedMs));
}
