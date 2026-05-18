import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@/lib/errors";
import {
  __resetStoreForTests,
  createChallengeRoom,
  evictFromMatchmaking,
  getRoom,
  getRoomBySlug,
  joinOrCreateMatchmaking,
  MAX_LIVE_ROOMS,
  newSessionToken,
} from "./store";

describe("race/store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetStoreForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("joinOrCreateMatchmaking returns the same open room for the same mode", () => {
    const a = joinOrCreateMatchmaking("1v1v1v1", 1);
    const b = joinOrCreateMatchmaking("1v1v1v1", 1);
    expect(a.id).toBe(b.id);
  });

  it("creates separate rooms for different modes", () => {
    const a = joinOrCreateMatchmaking("1v1v1v1", 1);
    const b = joinOrCreateMatchmaking("1v1", 1);
    expect(a.id).not.toBe(b.id);
  });

  it("a room past matching is no longer reused for new joiners", () => {
    const room = joinOrCreateMatchmaking("1v1", 1);
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000);
    evictFromMatchmaking(room);
    const next = joinOrCreateMatchmaking("1v1", 1);
    expect(next.id).not.toBe(room.id);
  });

  it("getRoom by id round-trips", () => {
    const room = joinOrCreateMatchmaking("1v1v1v1", 1);
    expect(getRoom(room.id)?.id).toBe(room.id);
    expect(getRoom("missing")).toBeNull();
  });

  it("createChallengeRoom assigns a slug and is reachable via getRoomBySlug", () => {
    const room = createChallengeRoom({ modeId: "1v1", raceSeed: 7 });
    expect(room.slug).toBeTruthy();
    expect(getRoomBySlug(room.slug as string)?.id).toBe(room.id);
  });

  it("newSessionToken produces unique strings", () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^s_[a-f0-9]+$/);
  });

  it("rooms expose canJoinAsReal until matchmaking ends", () => {
    const room = joinOrCreateMatchmaking("1v1", 1);
    expect(room.canJoinAsReal()).toBe(true);
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    expect(room.canJoinAsReal()).toBe(true);
    vi.advanceTimersByTime(5_000);
    expect(room.canJoinAsReal()).toBe(false);
  });

  describe("global room cap", () => {
    it("createChallengeRoom 503s once live rooms hit MAX_LIVE_ROOMS", () => {
      // Saturate the store with challenge rooms (unique slugs/ids).
      for (let i = 0; i < MAX_LIVE_ROOMS; i++) {
        createChallengeRoom({ modeId: "1v1", raceSeed: i });
      }
      expect(() => createChallengeRoom({ modeId: "1v1", raceSeed: 999 }))
        .toThrowError(BackendError);
      try {
        createChallengeRoom({ modeId: "1v1", raceSeed: 999 });
      } catch (err) {
        expect(err).toBeInstanceOf(BackendError);
        const be = err as BackendError;
        expect(be.status).toBe(503);
        expect(be.code).toBe("CONFLICT");
        expect(be.details).toMatchObject({ cap: MAX_LIVE_ROOMS });
      }
    });

    it("joinOrCreateMatchmaking still reuses existing rooms even at cap", () => {
      // First call creates the matchmaking room for this mode.
      const first = joinOrCreateMatchmaking("sprint", 1);
      // Fill the rest of the store with challenge rooms.
      for (let i = 0; i < MAX_LIVE_ROOMS - 1; i++) {
        createChallengeRoom({ modeId: "1v1", raceSeed: i });
      }
      // We're at the cap, but the matchmaking mode still has an open
      // room — joining shouldn't try to create.
      const second = joinOrCreateMatchmaking("sprint", 2);
      expect(second.id).toBe(first.id);
    });

    it("joinOrCreateMatchmaking 503s when a fresh mode bucket would need a new room past the cap", () => {
      for (let i = 0; i < MAX_LIVE_ROOMS; i++) {
        createChallengeRoom({ modeId: "1v1", raceSeed: i });
      }
      expect(() => joinOrCreateMatchmaking("sprint", 1))
        .toThrowError(BackendError);
    });
  });
});
