import { describe, expect, it } from "vitest";
import {
  broadcastPlan,
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

  it("heartbeats (full payload) while typing OR on the results screen, unwatched", () => {
    for (const phase of ["running", "done"]) {
      expect(broadcastPlan(false, phase)).toEqual({
        push: true,
        includeScreen: true,
        nextDelayMs: HEARTBEAT_MS,
      });
    }
  });

  it("streams at full rate with the clone payload whenever watched, any phase", () => {
    for (const phase of ["rest", "running", "done"]) {
      expect(broadcastPlan(true, phase)).toEqual({
        push: true,
        includeScreen: true,
        nextDelayMs: WATCHED_MS,
      });
    }
  });
});

describe("watchPollDelay", () => {
  it("polls briskly while live and backs off hard when not", () => {
    expect(watchPollDelay(true)).toBe(WATCH_POLL_LIVE_MS);
    expect(watchPollDelay(false)).toBe(WATCH_POLL_IDLE_MS);
    expect(WATCH_POLL_IDLE_MS).toBeGreaterThan(WATCH_POLL_LIVE_MS * 3);
  });
});
