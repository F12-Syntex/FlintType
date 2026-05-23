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

// ─── Live lock flag ──────────────────────────────────────────────────
//
// The keystroke handlers that turn input into practice state — the
// hidden <InputCapture> input (onKeyDown + onBeforeInput) and the
// practice surface's own window keydown handler — live *above* the race
// provider in the tree, so a React prop / context can't reach them
// cleanly. Instead the race provider publishes the lock to this tiny
// module store, and every keystroke handler reads it synchronously
// before dispatching. Gating at the dispatch site (rather than trying
// to swallow the DOM event in a capture listener) is reliable: it
// doesn't depend on listener registration order or React's event
// delegation. Defaults to unlocked; single-player never sets it.

let liveLocked = false;

/** Set by the race provider on every phase change (and reset to false
 *  when the race surface unmounts). */
export function setRaceInputLocked(locked: boolean): void {
  liveLocked = locked;
}

/** Read by the keystroke handlers right before they dispatch. */
export function isRaceInputCurrentlyLocked(): boolean {
  return liveLocked;
}
