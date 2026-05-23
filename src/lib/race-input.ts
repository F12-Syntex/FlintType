import type { RacePhase } from "@/types/race";

/** Whether keystroke input must be ignored for the given race phase.
 *
 *  During matchmaking, the locked lobby, and the 3-2-1 countdown the
 *  passage is on screen but the run has not begun — typing must not
 *  register. Only `racing` (and `finished`, where the user may have
 *  crossed the line) accept input. The server already drops any
 *  progress posted before `racing` (see `Room.setProgress`); this is
 *  the client-side half so the user never even *sees* their own
 *  keystrokes land early. */
export function isRaceInputLocked(phase: RacePhase | null | undefined): boolean {
  return phase === "matching" || phase === "lobby" || phase === "countdown";
}
