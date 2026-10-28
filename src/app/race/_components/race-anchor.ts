/** Pure helpers that keep a racer's own numbers on the server's clock.
 *
 *  The race authority times every racer from the gun (`raceStartedAt`),
 *  not from their first keystroke: see `Room.setProgress`. The practice
 *  engine on its own starts its clock on the first keystroke, so a racer
 *  who waited two seconds after the gun saw a live figure well above the
 *  result the server recorded. `useGunAnchoredRun` fixes that by
 *  anchoring the run on `localGunInstant`. Tested in `race-anchor.test.ts`. */

/** This client's local wall-clock time of the gun.
 *
 *  Skew-safe: raw `Date.now()` is never compared with a server stamp
 *  (the old bug that published 0 wpm for a whole race did exactly
 *  that). Two estimates, both on the local clock:
 *
 *  - Seen: when this client saw the room go live. `serverNowMs −
 *    raceStartedAt` is a difference of two SERVER stamps (how long the
 *    race had run when the snapshot was built), subtracted from the
 *    LOCAL time the snapshot was seen. For the snapshot that flips the
 *    room to "racing" that is a few ms, so this is the moment input
 *    unlocked; a client that first sees the room mid-race (a reload
 *    into a running lobby) still gets the real gun instead of "now".
 *  - Countdown end: `raceStartedAt − offset`, where `offset` is the
 *    running server-minus-local estimate the countdown digit already
 *    uses (`mergeOffset`, race-clock.ts). Its samples can only under-
 *    estimate the offset (each includes that snapshot's network
 *    latency), so this lands at or just after the true gun.
 *
 *  The earlier of the two wins: it is never later than when input
 *  unlocked, and it drops the delivery lag of the "racing" snapshot,
 *  which the server counts too (it times from `raceStartedAt`). */
export function localGunInstant(
  localNowMs: number,
  serverNowMs: number,
  raceStartedAt: number,
  offset: number | null = null,
): number {
  const seen = localNowMs - Math.max(0, serverNowMs - raceStartedAt);
  return offset == null ? seen : Math.min(seen, raceStartedAt - offset);
}

/** Net WPM the way the race authority computes it in
 *  `Room.setProgress`: correct characters (cursor progress minus
 *  keystroke errors) over the time since the gun, with the window
 *  floored at one second.
 *
 *  Advisory only: the server ignores the posted wpm (`_clientWpm`) and
 *  recomputes its own from progress, and every race number on screen
 *  comes from the snapshot. This mirror just keeps the wire value
 *  honest; never read it back as the racer's result. If the server
 *  formula changes, change this one with it. */
export function raceNetWpm(
  progressChars: number,
  errors: number,
  elapsedMs: number,
): number {
  const elapsedSec = Math.max(1, elapsedMs / 1000);
  const correct = Math.max(0, progressChars - errors);
  return Math.max(0, Math.round((correct / 5) * (60 / elapsedSec)));
}

/** The wpm a racer publishes with a progress post, measured at `nowMs`
 *  (or at the run's end once it has one) over the run's own clock.
 *  Same-clock subtraction only: `startTime` / `endTime` are local
 *  times from the practice run, which `useGunAnchoredRun` pins to the
 *  local gun. 0 until the clock has started. */
export function publishedWpm(
  run: {
    correctChars: number;
    errors: number;
    startTime: number | null;
    endTime: number | null;
  },
  nowMs: number,
): number {
  if (run.startTime == null) return 0;
  const end = run.endTime ?? nowMs;
  return raceNetWpm(run.correctChars, run.errors, Math.max(0, end - run.startTime));
}
