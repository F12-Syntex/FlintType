import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetStoreForTests,
  createChallengeRoom,
  evictFromMatchmaking,
  getRoom,
  getRoomBySlug,
  joinOrCreateMatchmaking,
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
});
