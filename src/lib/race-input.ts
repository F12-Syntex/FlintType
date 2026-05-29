import type { RacePhase } from "@/types/race";

/** Whether keystroke input must be ignored for the given race phase.
 *
 *  Input is allowed **only** while the room is actually `racing` (or
 *  `finished`, where the user may have crossed the line). Every other
 *  phase is locked — matchmaking, the lobby, the 3-2-1 countdown, and
 *  crucially the *connecting* window where no snapshot has arrived yet
 *  (`null`/`undefined`). That last case is the one that bit us: if the
 *  lock defaults open before the first snapshot, a user spamming keys
 *  the instant they enter accumulates local progress that then gets
 *  dumped at the gun. The server is the real authority (it rejects
 *  pre-race posts and clamps progress to what's typeable since the
 *  gun — see `Room.setProgress`); this is the client half so nothing
 *  accumulates locally and the user never sees phantom progress. */
export function isRaceInputLocked(
  phase: RacePhase | null | undefined,
  youFinished = false,
): boolean {
  // Locked unless the room is actively `racing`. The `finished` phase
  // (whole race over) is now locked too — previously it was open, which
  // let a racer keep typing into the passage for the post-race window
  // (#11). And once the LOCAL racer has crossed the line, lock them even
  // while others are still racing — their run is done.
  if (youFinished) return true;
  return phase !== "racing";
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
