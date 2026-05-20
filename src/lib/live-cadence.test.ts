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
  it("STOPS entirely when idle and unwatched (the flood we're killing)", () => {
    expect(broadcastPlan(false, "rest")).toEqual({
      push: false,
      includeScreen: false,
      nextDelayMs: null,
    });
    expect(broadcastPlan(false, "done")).toEqual({
      push: false,
      includeScreen: false,
      nextDelayMs: null,
    });
  });

  it("heartbeats slowly while typing-unwatched but STILL sends the full clone payload", () => {
    expect(broadcastPlan(false, "running")).toEqual({
      push: true,
      includeScreen: true,
      nextDelayMs: HEARTBEAT_MS,
    });
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
