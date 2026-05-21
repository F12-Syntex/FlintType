import { describe, expect, it } from "vitest";
import {
  broadcastPlan,
  DONE_BROADCAST_GRACE_MS,
  HEARTBEAT_MS,
  WATCH_POLL_IDLE_MS,
  WATCH_POLL_LIVE_MS,
  WATCHED_MS,
  watchPollDelay,
} from "./live-cadence";

describe("broadcastPlan", () => {
  it("STOPS entirely when resting (not begun) and unwatched (the flood we're killing)", () => {
    expect(broadcastPlan(false, "rest")).toEqual({
      push: false,
      includeScreen: false,
      nextDelayMs: null,
    });
  });

  it("heartbeats (full payload) while typing OR freshly on the results screen, unwatched", () => {
    expect(broadcastPlan(false, "running")).toEqual({
      push: true,
      includeScreen: true,
      nextDelayMs: HEARTBEAT_MS,
    });
    // Fresh done (within the grace window) still heartbeats so a late
    // watcher catches the results.
    expect(broadcastPlan(false, "done", 0)).toEqual({
      push: true,
      includeScreen: true,
      nextDelayMs: HEARTBEAT_MS,
    });
    expect(broadcastPlan(false, "done", DONE_BROADCAST_GRACE_MS - 1)).toEqual({
      push: true,
      includeScreen: true,
      nextDelayMs: HEARTBEAT_MS,
    });
  });

  it("STOPS an unwatched results screen once the grace window elapses (no forever-heartbeat)", () => {
    expect(broadcastPlan(false, "done", DONE_BROADCAST_GRACE_MS)).toEqual({
      push: false,
      includeScreen: false,
      nextDelayMs: null,
    });
    expect(broadcastPlan(false, "done", DONE_BROADCAST_GRACE_MS + 60_000)).toEqual({
      push: false,
      includeScreen: false,
      nextDelayMs: null,
    });
  });

  it("keeps a still-typing (running) broadcaster heartbeating regardless of doneForMs", () => {
    // doneForMs only gates the done screen; a running run is never capped.
    expect(broadcastPlan(false, "running", DONE_BROADCAST_GRACE_MS * 10)).toEqual({
      push: true,
      includeScreen: true,
      nextDelayMs: HEARTBEAT_MS,
    });
  });

  it("streams at full rate with the clone payload whenever watched, any phase — even past the done grace", () => {
    for (const phase of ["rest", "running", "done"]) {
      expect(broadcastPlan(true, phase)).toEqual({
        push: true,
        includeScreen: true,
        nextDelayMs: WATCHED_MS,
      });
    }
    // A watcher attached to a long-finished run still gets the full rate.
    expect(broadcastPlan(true, "done", DONE_BROADCAST_GRACE_MS * 10)).toEqual({
      push: true,
      includeScreen: true,
      nextDelayMs: WATCHED_MS,
    });
  });
});

describe("watchPollDelay", () => {
  it("polls briskly while live and backs off hard when not", () => {
    expect(watchPollDelay(true)).toBe(WATCH_POLL_LIVE_MS);
    expect(watchPollDelay(false)).toBe(WATCH_POLL_IDLE_MS);
    expect(WATCH_POLL_IDLE_MS).toBeGreaterThan(WATCH_POLL_LIVE_MS * 3);
  });
});
