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

export type BroadcastPlan = {
  /** Push a frame now? */
  push: boolean;
  /** Does the push carry the heavy clone `screen` payload? */
  includeScreen: boolean;
  /** Delay to the next attempt, or null to stop (idle + unwatched). */
  nextDelayMs: number | null;
};

/** What the practice broadcaster should do given who's watching and the
 *  run phase:
 *  - watched (any phase) → full rate + clone payload
 *  - typing, unwatched   → light heartbeat (no screen) for discoverability
 *  - idle, unwatched     → stop (no push, no reschedule) */
export function broadcastPlan(watched: boolean, phase: string): BroadcastPlan {
  const running = phase === "running";
  return {
    push: watched || running,
    includeScreen: watched,
    nextDelayMs: watched ? WATCHED_MS : running ? HEARTBEAT_MS : null,
  };
}

/** How long the spectator waits before its next `live.watch` poll:
 *  brisk while the target is live, a slow backoff when they're not. */
export function watchPollDelay(live: boolean): number {
  return live ? WATCH_POLL_LIVE_MS : WATCH_POLL_IDLE_MS;
}
