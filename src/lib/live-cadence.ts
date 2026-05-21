/** Live-spectate cadence — the pure decisions that govern how often the
 *  client talks to the server. Extracted from the broadcaster + watcher
 *  effects so the load behaviour is provable in a unit test, not just
 *  "trust the effect". */

/** Full-fidelity push interval while someone is watching. */
export const WATCHED_MS = 700;
/** Light heartbeat interval while typing but unwatched (discoverability). */
export const HEARTBEAT_MS = 2_000;
/** Spectator poll interval while the target is live. */
export const WATCH_POLL_LIVE_MS = 900;
/** Spectator poll backoff while the target is not live. */
export const WATCH_POLL_IDLE_MS = 4_000;
/** How long after a run finishes an UNWATCHED broadcaster keeps
 *  publishing its results screen so a friend who clicks in late still
 *  catches it. Past this, an unwatched results screen STOPS — otherwise
 *  it would heartbeat every 2s (a DB write + a function invocation) for
 *  as long as the tab stays open on the results page. A watcher already
 *  attached keeps the full rate regardless. */
export const DONE_BROADCAST_GRACE_MS = 30_000;

export type BroadcastPlan = {
  /** Push a frame now? */
  push: boolean;
  /** Does the push carry the full clone `screen` payload? Always true
   *  when pushing — a spectator must ALWAYS get the 1:1 screen, never a
   *  stripped fallback. (Efficiency comes from pushing less often when
   *  unwatched, not from sending less.) */
  includeScreen: boolean;
  /** Delay to the next attempt, or null to stop (idle + unwatched). */
  nextDelayMs: number | null;
};

/** What the practice broadcaster should do given who's watching, the run
 *  phase, and (for the done screen) how long it's been finished.
 *  Efficiency is purely about *cadence*, never about stripping the
 *  payload:
 *  - watched (any phase) → full rate, full clone payload
 *  - typing, unwatched → slow heartbeat, full clone payload
 *  - on the results screen, unwatched → slow heartbeat for a grace
 *    window (so a friend who clicks in late still sees the results),
 *    then STOP — an idle results tab must not heartbeat forever
 *  - resting + unwatched (sitting at the start, not begun) → stop
 *
 *  `doneForMs` is how long the run has been in the `done` phase; it only
 *  matters on the unwatched results screen. */
export function broadcastPlan(
  watched: boolean,
  phase: string,
  doneForMs = 0,
): BroadcastPlan {
  if (watched) {
    return { push: true, includeScreen: true, nextDelayMs: WATCHED_MS };
  }
  if (phase === "running") {
    return { push: true, includeScreen: true, nextDelayMs: HEARTBEAT_MS };
  }
  if (phase === "done" && doneForMs < DONE_BROADCAST_GRACE_MS) {
    return { push: true, includeScreen: true, nextDelayMs: HEARTBEAT_MS };
  }
  return { push: false, includeScreen: false, nextDelayMs: null };
}

/** How long the spectator waits before its next `live.watch` poll:
 *  brisk while the target is live, a slow backoff when they're not. */
export function watchPollDelay(live: boolean): number {
  return live ? WATCH_POLL_LIVE_MS : WATCH_POLL_IDLE_MS;
}
