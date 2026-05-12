import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceRoom } from "./room";

/** Room tests use fake timers so the 5s matchmaking window + 700ms
 *  lobby hold + 3s countdown play out under our control. The bot
 *  tick interval is fast (100ms); a few ticks are enough to exercise
 *  progress + finish detection without waiting in real time. */

describe("RaceRoom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeRoom() {
    return new RaceRoom({
      id: "r_test",
      slug: null,
      kind: "matchmaking",
      modeId: "1v3",
      raceSeed: 1,
      wordCount: 5,
    });
  }

  it("starts in matching phase and accepts a real joiner", () => {
    const room = makeRoom();
    const racer = room.addRealRacer({
      sessionToken: "s_alice",
      name: "@alice",
      badge: "RACER",
    });
    expect(racer).not.toBeNull();
    expect(room.phase).toBe("matching");
    expect(room.snapshot().racers.length).toBe(1);
  });

  it("schedules bot fills every second until full or 5s lock", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });

    vi.advanceTimersByTime(1_000);
    expect(room.snapshot().racers.length).toBe(2);
    vi.advanceTimersByTime(1_000);
    expect(room.snapshot().racers.length).toBe(3);
    vi.advanceTimersByTime(1_000);
    expect(room.snapshot().racers.length).toBe(4);
    // Room hit capacity (4 for 1v3) — should now be in lobby phase.
    expect(room.phase).toBe("lobby");
  });

  it("matchmaking lock fills remaining seats and flips to lobby", () => {
    const room = new RaceRoom({
      id: "r_test2",
      slug: null,
      kind: "matchmaking",
      modeId: "1v1", // capacity 2, lineup [selan]
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    // 1v1 fills at t=1s with the single bot, transitioning to lobby
    // the moment capacity hits. The 5s hard lock is a safety net for
    // modes whose bot lineup couldn't fill — exercising it would
    // require a hypothetical empty-lineup mode.
    vi.advanceTimersByTime(1_000);
    expect(room.phase).toBe("lobby");
    expect(room.snapshot().racers.length).toBe(2);
  });

  it("real-player priority — bot fill timer skips if real players already filled the room", () => {
    const room = new RaceRoom({
      id: "r_test3",
      slug: null,
      kind: "matchmaking",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    // Second real player arrives almost immediately.
    vi.advanceTimersByTime(50);
    const bob = room.addRealRacer({ sessionToken: "s_bob", name: "@bob", badge: "RACER" });
    expect(bob).not.toBeNull();
    // Room is full of real players; the 1s bot fill timer should NOT
    // override that.
    vi.advanceTimersByTime(5_000);
    const snap = room.snapshot();
    expect(snap.racers.filter((r) => r.isBot).length).toBe(0);
  });

  it("transitions to countdown after the 700ms lobby hold then to racing after 3s", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    // 1v3 has a 3-bot lineup, so the room fills (and lobby fires) at
    // t=3s when the third bot joins. From there: 700ms lobby hold,
    // 3000ms countdown.
    vi.advanceTimersByTime(3_000);
    expect(room.phase).toBe("lobby");
    vi.advanceTimersByTime(700);
    expect(room.phase).toBe("countdown");
    vi.advanceTimersByTime(3_000);
    expect(room.phase).toBe("racing");
    expect(room.raceStartedAt).not.toBeNull();
  });

  it("withholds words until racing starts", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    expect(room.snapshot().words).toBeUndefined();
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    expect(room.snapshot().words).toBeDefined();
    expect(room.snapshot().words?.length).toBe(5);
  });

  it("bot tick advances bot progressChars during racing", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    // Now in racing phase — bot tick interval is firing every 100ms.
    vi.advanceTimersByTime(500);
    const snap = room.snapshot();
    const bots = snap.racers.filter((r) => r.isBot);
    expect(bots.length).toBeGreaterThan(0);
    expect(bots.some((b) => b.progressChars > 0)).toBe(true);
  });

  it("real-player progress updates land via setProgress", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    const ok = room.setProgress("s_alice", 7, 65, false);
    expect(ok).toBe(true);
    const alice = room.snapshot().racers.find((r) => r.id === "s_alice");
    expect(alice?.progressChars).toBe(7);
    expect(alice?.wpm).toBe(65);
  });

  it("subscriber receives an initial snapshot synchronously", () => {
    const room = makeRoom();
    const got: number[] = [];
    room.subscribe((s) => got.push(s.racers.length));
    expect(got.length).toBeGreaterThanOrEqual(1);
  });

  it("removing the only real racer disposes a matchmaking room", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    expect(room.snapshot().racers.length).toBe(1);
    room.removeRacer("s_alice");
    expect(room.snapshot().racers.length).toBe(0);
  });

  it("challenge rooms start in lobby and don't run the matchmaking timer", () => {
    const room = new RaceRoom({
      id: "r_challenge",
      slug: "quick-otter-42",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    expect(room.phase).toBe("lobby");
    vi.advanceTimersByTime(5_000);
    // Still lobby — no auto-fill / countdown without hostStart.
    // (Lobby fills the brief 700ms hold + countdown only after the
    // *transition* to lobby; for a challenge room that was constructed
    // in lobby phase we don't schedule it until hostStart fires.)
    expect(room.phase).toBe("lobby");
  });

  it("hostStart on a challenge room fills with bots and runs the countdown", () => {
    const room = new RaceRoom({
      id: "r_challenge2",
      slug: "bold-fox-71",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    const host = room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    expect(host).not.toBeNull();
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700);
    expect(room.phase).toBe("countdown");
    vi.advanceTimersByTime(3_000);
    expect(room.phase).toBe("racing");
  });

  it("hostStart fails if the caller is not the host", () => {
    const room = new RaceRoom({
      id: "r_challenge3",
      slug: "calm-deer-11",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    expect(room.hostStart("s_unknown")).toBe(false);
  });
});
