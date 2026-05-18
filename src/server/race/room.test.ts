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
      modeId: "1v1v1v1",
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
    // Room hit capacity (4 for 1v1v1v1) — should now be in lobby phase.
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
    // 1v1v1v1 has a 3-bot lineup, so the room fills (and lobby fires) at
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

  it("setProgress accepts an errors count and surfaces it on the snapshot", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    room.setProgress("s_alice", 6, 60, false, 2);
    const alice = room.snapshot().racers.find((r) => r.id === "s_alice");
    expect(alice?.errors).toBe(2);
  });

  it("removeRacer pre-race drops the seat outright", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    expect(room.snapshot().racers.length).toBe(1);
    room.removeRacer("s_alice");
    expect(room.snapshot().racers.find((r) => r.id === "s_alice")).toBeUndefined();
  });

  it("removeRacer mid-race flags disconnected instead of deleting", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    expect(room.phase).toBe("racing");
    room.removeRacer("s_alice");
    const alice = room.snapshot().racers.find((r) => r.id === "s_alice");
    expect(alice).toBeDefined();
    expect(alice?.disconnected).toBe(true);
  });

  it("re-joining with the same sessionToken clears the disconnected flag", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    room.removeRacer("s_alice");
    expect(room.snapshot().racers.find((r) => r.id === "s_alice")?.disconnected).toBe(true);
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    expect(room.snapshot().racers.find((r) => r.id === "s_alice")?.disconnected).toBe(false);
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

  it("hostCancel broadcasts a cancelled snapshot then disposes", () => {
    const room = new RaceRoom({
      id: "r_cancel1",
      slug: "kind-bear-22",
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
    const received: Array<{ cancelled?: boolean; phase: string }> = [];
    room.subscribe((snap) =>
      received.push({ cancelled: snap.cancelled, phase: snap.phase }),
    );
    expect(room.hostCancel("s_host")).toBe(true);
    // First emit on subscribe (no cancel flag), then the final
    // cancelled emit, then dispose clears subs.
    expect(received.at(-1)?.cancelled).toBe(true);
  });

  it("hostCancel rejects non-hosts", () => {
    const room = new RaceRoom({
      id: "r_cancel2",
      slug: "kind-bear-23",
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
    expect(room.hostCancel("s_unknown")).toBe(false);
  });

  it("host leaving promotes the next real racer to host (room stays alive)", () => {
    let idleFired = false;
    const room = new RaceRoom({
      id: "r_host_leave_1",
      slug: "warm-otter-99",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
      onIdle: () => {
        idleFired = true;
      },
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    room.addRealRacer({
      sessionToken: "s_guest",
      name: "@guest",
      badge: "RACER",
    });
    room.removeRacer("s_host");
    const snap = room.snapshot();
    // Guest inherits host. Room stays alive; no cancellation; slug
    // hasn't been freed.
    expect(snap.cancelled).toBeUndefined();
    expect(idleFired).toBe(false);
    expect(snap.racers.find((r) => r.id === "s_host")).toBeUndefined();
    expect(snap.racers.find((r) => r.id === "s_guest")?.isHost).toBe(true);
  });

  it("host leaving with no other real racer disposes the challenge room", () => {
    let idleFired = false;
    const room = new RaceRoom({
      id: "r_host_leave_solo",
      slug: "warm-otter-99b",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
      onIdle: () => {
        idleFired = true;
      },
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    const received: Array<{ cancelled?: boolean }> = [];
    room.subscribe((snap) => received.push({ cancelled: snap.cancelled }));
    room.removeRacer("s_host");
    expect(received.at(-1)?.cancelled).toBe(true);
    expect(idleFired).toBe(true);
  });

  it("host migration uses longest-tenured remaining racer", () => {
    const room = new RaceRoom({
      id: "r_host_migrate_order",
      slug: "warm-otter-99c",
      kind: "challenge",
      modeId: "1v1v1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    vi.advanceTimersByTime(10);
    room.addRealRacer({ sessionToken: "s_b", name: "@b", badge: "RACER" });
    vi.advanceTimersByTime(10);
    room.addRealRacer({ sessionToken: "s_c", name: "@c", badge: "RACER" });
    room.removeRacer("s_host");
    const snap = room.snapshot();
    // s_b joined before s_c → s_b inherits.
    expect(snap.racers.find((r) => r.id === "s_b")?.isHost).toBe(true);
    expect(snap.racers.find((r) => r.id === "s_c")?.isHost).toBe(false);
  });

  it("host migration mid-race marks the leaver disconnected and promotes successor", () => {
    const room = new RaceRoom({
      id: "r_host_leave_midrace",
      slug: "warm-otter-99d",
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
    room.addRealRacer({ sessionToken: "s_guest", name: "@guest", badge: "RACER" });
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000); // lobby + countdown
    expect(room.phase).toBe("racing");
    room.removeRacer("s_host");
    const snap = room.snapshot();
    // Mid-race: host is kept in the snapshot (disconnected) but the
    // host bit migrates to the guest — exactly one host at all times.
    const host = snap.racers.find((r) => r.id === "s_host");
    expect(host?.disconnected).toBe(true);
    expect(host?.isHost).toBe(false);
    expect(snap.racers.find((r) => r.id === "s_guest")?.isHost).toBe(true);
  });

  it("non-host leaving as the last real active racer disposes the challenge room", () => {
    let idleFired = false;
    const room = new RaceRoom({
      id: "r_last_real_out",
      slug: "warm-otter-99e",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
      onIdle: () => {
        idleFired = true;
      },
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    room.addRealRacer({ sessionToken: "s_guest", name: "@guest", badge: "RACER" });
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    // Host disconnects → guest inherits.
    room.removeRacer("s_host");
    expect(idleFired).toBe(false);
    // Guest leaves too → no real active racers, dispose fires.
    room.removeRacer("s_guest");
    expect(idleFired).toBe(true);
  });

  it("non-host leaving a challenge room does NOT cancel it", () => {
    let idleFired = false;
    const room = new RaceRoom({
      id: "r_guest_leave_1",
      slug: "warm-otter-100",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
      onIdle: () => {
        idleFired = true;
      },
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    room.addRealRacer({
      sessionToken: "s_guest",
      name: "@guest",
      badge: "RACER",
    });
    room.removeRacer("s_guest");
    // Guest leaving drops their seat but the lobby stays alive for
    // the host. onIdle must not fire.
    expect(idleFired).toBe(false);
    expect(room.snapshot().cancelled).toBeUndefined();
    expect(room.snapshot().racers.find((r) => r.id === "s_host")).toBeDefined();
  });

  it("challenge room does NOT auto-dispose 5 min after a race finishes", () => {
    let idleFired = false;
    const room = new RaceRoom({
      id: "r_challenge_post_finish_1",
      slug: "warm-otter-101",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
      onIdle: () => {
        idleFired = true;
      },
    });
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000); // lobby + countdown
    expect(room.phase).toBe("racing");
    // Drive the room to finish: real player completes the passage,
    // bot tick eventually finishes too.
    room.setProgress("s_host", room.totalChars, 100, true);
    vi.advanceTimersByTime(60_000); // bot finishes within 60s
    expect(room.phase).toBe("finished");
    // Matchmaking rooms would dispose 5 min after finish; challenge
    // rooms must stay alive until the host leaves or cancels.
    vi.advanceTimersByTime(5 * 60_000 + 1_000);
    expect(idleFired).toBe(false);
  });

  it("hostCancel works from racing phase too", () => {
    const room = new RaceRoom({
      id: "r_cancel3",
      slug: "kind-bear-24",
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
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    expect(room.hostCancel("s_host")).toBe(true);
  });

  /* ─── Rematch ───────────────────────────────────────────── */

  /** Drive a 1v1 room through joining → countdown → racing → finished
   *  and return it ready for a rematch test. Real player auto-finishes
   *  by setting progress to totalChars; bot finishes by ticking under
   *  fake timers. */
  function makeFinished1v1(): RaceRoom {
    const room = new RaceRoom({
      id: "r_rematch_" + Math.random().toString(36).slice(2),
      slug: null,
      kind: "matchmaking",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({
      sessionToken: "s_alice",
      name: "@alice",
      badge: "RACER",
    });
    vi.advanceTimersByTime(1_000); // bot joins
    vi.advanceTimersByTime(700); // lobby hold
    vi.advanceTimersByTime(3_000); // countdown
    expect(room.phase).toBe("racing");
    // Alice finishes immediately
    room.setProgress("s_alice", room.totalChars, 100, true);
    // Tick bots until they cross the line too
    vi.advanceTimersByTime(20_000);
    expect(room.phase).toBe("finished");
    return room;
  }

  it("markRematchReady starts a new round instantly in a 1-real room", () => {
    const room = makeFinished1v1();
    const beforeRound = room.roundNumber;
    const beforeWords = room.words;
    const res = room.markRematchReady("s_alice");
    expect(res.ok).toBe(true);
    expect(res.started).toBe(true);
    expect(room.roundNumber).toBe(beforeRound + 1);
    expect(room.phase).toBe("lobby");
    // Word room: passage re-rolls. (Identity unlikely-but-possible with
    // the seed bump, so allow either — what we really care about is
    // that the state machine reset cleanly.)
    expect(room.words.length).toBe(beforeWords.length);
  });

  it("startNewRound resets every racer's progress / errors / wpm / accuracy / place", () => {
    const room = makeFinished1v1();
    const finishedAlice = room.snapshot().racers.find((r) => r.id === "s_alice");
    expect(finishedAlice?.finishedAt).not.toBeNull();
    room.markRematchReady("s_alice");
    // Snapshot after rematch trigger — phase=lobby and racers wiped
    const snap = room.snapshot();
    for (const r of snap.racers) {
      expect(r.progressChars).toBe(0);
      expect(r.errors).toBe(0);
      expect(r.wpm).toBe(0);
      expect(r.accuracy).toBe(100);
      expect(r.finishedAt).toBeNull();
      expect(r.place).toBeNull();
    }
  });

  it("markRematchReady rejects votes outside the finished phase", () => {
    const room = new RaceRoom({
      id: "r_rematch_phase",
      slug: null,
      kind: "matchmaking",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({
      sessionToken: "s_alice",
      name: "@alice",
      badge: "RACER",
    });
    // Still in matching phase
    expect(room.markRematchReady("s_alice").ok).toBe(false);
    expect(room.markRematchReady("s_alice").started).toBe(false);
  });

  it("markRematchReady rejects bots and unknown tokens", () => {
    const room = makeFinished1v1();
    // Find the bot token
    const bot = room.snapshot().racers.find((r) => r.isBot);
    expect(bot).toBeDefined();
    expect(room.markRematchReady(bot!.id).ok).toBe(false);
    expect(room.markRematchReady("s_unknown").ok).toBe(false);
    expect(room.snapshot().rematchReady.length).toBe(0);
  });

  it("snapshot exposes rematchReady + roundNumber", () => {
    const room = makeFinished1v1();
    expect(room.snapshot().roundNumber).toBe(1);
    expect(room.snapshot().rematchReady).toEqual([]);
    // After voting + before threshold flip-through: rematchReady is
    // cleared the moment the new round starts, so a 1-real room
    // never observes a non-empty list. Verify the path with an
    // explicit assertion right after the rematch fires — round bumps
    // and rematchReady stays empty (cleared as part of startNewRound).
    room.markRematchReady("s_alice");
    expect(room.snapshot().rematchReady).toEqual([]);
    expect(room.snapshot().roundNumber).toBe(2);
  });
});
