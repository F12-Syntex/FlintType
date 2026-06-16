/** Server-anchored race clock.
 *
 *  The race authority stamps every snapshot with `serverNowMs` (its
 *  own wall clock at emission) and publishes the countdown / start
 *  anchors (`countdownStartedAt`, `raceStartedAt`) on that same
 *  clock. The client must never compare those anchors against its
 *  own raw `Date.now()` — any device-clock skew shifts the countdown
 *  and elapsed readouts by the full skew amount.
 *
 *  Instead the client keeps a running estimate of
 *  `offset = serverClock − localClock`, sampled each time a snapshot
 *  arrives, and derives every timing as
 *  `serverNow = Date.now() + offset`. Because a snapshot is stamped
 *  on the server and only then travels the network, each sample
 *  *underestimates* the true offset by the one-way latency — so the
 *  largest sample seen is the most accurate, and `mergeOffset` keeps
 *  a running max (with a reset guard for genuine clock jumps). */

export const RACE_COUNTDOWN_MS = 3_000;

/** A sample is reset (rather than max-merged) when it disagrees with
 *  the running estimate by more than this — covers NTP slews, laptop
 *  sleep/wake, and the server process restarting with a new clock. */
const OFFSET_RESET_THRESHOLD_MS = 5_000;

/** One raw skew sample: server's clock minus ours, as measured at the
 *  moment a snapshot arrived. */
export function offsetSample(serverNowMs: number, localNowMs: number): number {
  return serverNowMs - localNowMs;
}

/** Fold a new sample into the running offset estimate. */
export function mergeOffset(prev: number | null, sample: number): number {
  if (prev == null) return sample;
  if (Math.abs(sample - prev) > OFFSET_RESET_THRESHOLD_MS) return sample;
  // Larger sample ⇒ less network latency in the measurement ⇒ closer
  // to the true offset. Keep the max.
  return Math.max(prev, sample);
}

/** Best estimate of the server's current wall clock. */
export function serverNow(offset: number | null, localNowMs: number): number {
  return localNowMs + (offset ?? 0);
}

/** The 3..2..1 digit, derived purely from server-clock values.
 *  Returns 0 once the countdown has elapsed (the "GO" frame). */
export function countdownDigit(
  countdownStartedAt: number | null,
  serverNowMs: number,
  durationMs: number = RACE_COUNTDOWN_MS,
): number | null {
  if (countdownStartedAt == null) return null;
  const left = durationMs - (serverNowMs - countdownStartedAt);
  const top = Math.ceil(durationMs / 1000);
  return Math.min(top, Math.max(0, Math.ceil(left / 1000)));
}

/** Whole seconds elapsed since the gun, on the server clock. */
export function elapsedSeconds(
  raceStartedAt: number | null,
  serverNowMs: number,
): number {
  if (raceStartedAt == null) return 0;
  return Math.max(0, Math.floor((serverNowMs - raceStartedAt) / 1000));
}
