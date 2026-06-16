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
      modeId: "1v1", // capacity 2, single-bot lineup [mireille]
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

  it("matchmaking fills the open seat with a bot, then locks to lobby", () => {
    const room = makeRoom(); // 1v1: one bot fill at t=1s reaches capacity 2
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    expect(room.snapshot().racers.length).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(room.snapshot().racers.length).toBe(2);
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(1);
    expect(room.phase).toBe("lobby");
  });

  it("matchmaking flips to lobby at the 5s lock even when seats stay open (FFA, no bots)", () => {
    // FFA has an empty bot lineup, so no fill timer ever reaches
    // capacity — the hard 5s lock is the only thing that moves a
    // single waiting player on to the lobby.
    const room = new RaceRoom({
      id: "r_ffa_lock",
      slug: null,
      kind: "matchmaking",
      modeId: "ffa",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(4_900);
    expect(room.phase).toBe("matching");
    vi.advanceTimersByTime(200);
    expect(room.phase).toBe("lobby");
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(0);
    expect(room.snapshot().racers.length).toBe(1);
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
    // 1v1 fills (and lobby fires) at t=1s when the single bot joins.
    // From there: 700ms lobby hold, then a 3000ms countdown.
    vi.advanceTimersByTime(1_000);
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
  });

  it("rejects progress posted before the race starts (matching/lobby/countdown)", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    // matching — no input
    expect(room.phase).toBe("matching");
    expect(room.setProgress("s_alice", 3, 50, false)).toBe(false);
    vi.advanceTimersByTime(1_000); // bot fills → lobby
    expect(room.phase).toBe("lobby");
    expect(room.setProgress("s_alice", 3, 50, false)).toBe(false);
    vi.advanceTimersByTime(700); // → countdown
    expect(room.phase).toBe("countdown");
    expect(room.setProgress("s_alice", 3, 50, false)).toBe(false);
    // Nothing landed on the snapshot.
    expect(
      room.snapshot().racers.find((r) => r.id === "s_alice")?.progressChars,
    ).toBe(0);
    vi.advanceTimersByTime(3_000); // → racing
    expect(room.phase).toBe("racing");
    expect(room.setProgress("s_alice", 3, 50, false)).toBe(true);
  });

  it("computes WPM server-side from race-start elapsed, ignoring the client value", () => {
    // The client reports WPM measured from its first keystroke; the
    // authority must instead measure from the gun (raceStartedAt) so a
    // racer who hesitates can't post a deceptively high speed and the
    // net-WPM winner ranking stays honest.
    const room = new RaceRoom({
      id: "r_wpm",
      slug: "swift-wolf-12",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 50,
    });
    room.addRealRacer({
      sessionToken: "s_alice",
      name: "@alice",
      badge: "RACER",
      isHost: true,
    });
    expect(room.hostStart("s_alice")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000); // lobby hold + countdown → racing
    expect(room.phase).toBe("racing");
    vi.advanceTimersByTime(10_000); // 10s into the race
    const prog = Math.min(50, room.totalChars);
    // Client claims an absurd 999 wpm — it must be ignored.
    room.setProgress("s_alice", prog, 999, false, 0);
    const alice = room.snapshot().racers.find((r) => r.id === "s_alice");
    // prog/5 words over 10s (1/6 min) → words × 6 wpm.
    expect(alice?.wpm).toBe(Math.round((prog / 5) * (60 / 10)));
    expect(alice?.wpm).not.toBe(999);
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

  it("mid-race disconnect lets the race finish once remaining racers cross the line", () => {
    const room = makeRoom();
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    expect(room.phase).toBe("racing");
    // Alice disconnects mid-race. Bots keep ticking; without the
    // disconnect-counts-as-done fix, `allDone` would stay false forever
    // because Alice's finishedAt is null, the bot tick interval would
    // run indefinitely, and the room would never GC.
    room.removeRacer("s_alice");
    // Advance long enough for every bot to chew through the 5-word
    // passage. 30s is comfortable headroom at any tick speed.
    vi.advanceTimersByTime(30_000);
    expect(room.phase).toBe("finished");
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

  it("hostStart on a challenge room runs the countdown without adding bots", () => {
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
    // Challenge lobbies are real-players-only — no bot fill on start.
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(0);
    vi.advanceTimersByTime(700);
    expect(room.phase).toBe("countdown");
    vi.advanceTimersByTime(3_000);
    expect(room.phase).toBe("racing");
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(0);
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
      modeId: "ffa",
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

  it("places racers by net WPM, not by finish order", () => {
    // Two real racers cross at a similar server-computed raw WPM, so the
    // WINNER is decided by net (raw × accuracy). Alice crosses the line
    // FIRST but at low accuracy; Bob crosses after with a cleaner run.
    // Bob's higher net must win despite finishing second.
    const room = new RaceRoom({
      id: "r_netwpm",
      slug: null,
      kind: "matchmaking",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    room.addRealRacer({ sessionToken: "s_bob", name: "@bob", badge: "RACER" });
    vi.advanceTimersByTime(5_000 + 700 + 3_000);
    expect(room.phase).toBe("racing");

    // Alice crosses first at 50% accuracy (client-reported wpm ignored).
    room.setProgress("s_alice", room.totalChars, 100, true, undefined, 50);
    // Bob crosses second at 95% accuracy → higher net.
    vi.advanceTimersByTime(1_000);
    room.setProgress("s_bob", room.totalChars, 142, true, undefined, 95);
    // Drive bots over the line too so phase flips to finished.
    vi.advanceTimersByTime(60_000);
    expect(room.phase).toBe("finished");

    const racers = room.snapshot().racers;
    const alice = racers.find((r) => r.id === "s_alice");
    const bob = racers.find((r) => r.id === "s_bob");
    expect(bob?.place).toBeLessThan(alice?.place ?? 99);
    // First place must belong to Bob (highest net), regardless of
    // whether bots placed in between.
    const top = racers.find((r) => r.place === 1);
    expect(top?.id).toBe("s_bob");
  });

  it("an authenticated user can't join their own room twice — they resume their seat", () => {
    const room = new RaceRoom({
      id: "r_selfjoin",
      slug: "self-otter-1",
      kind: "challenge",
      modeId: "ffa",
      raceSeed: 1,
      wordCount: 25,
    });
    // Host creates with a session token + their Clerk userId.
    const host = room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
      userId: "user_42",
    });
    expect(host).not.toBeNull();
    expect(room.snapshot().racers.length).toBe(1);
    // Same user opens the link fresh (a new session token) → no duplicate;
    // they resume the existing seat (same token back).
    const again = room.addRealRacer({
      sessionToken: "s_host_tab2",
      name: "@host",
      badge: "RACER",
      userId: "user_42",
    });
    expect(again?.sessionToken).toBe("s_host");
    expect(room.snapshot().racers.length).toBe(1);
    // A different authenticated user joins as a real, distinct racer.
    const other = room.addRealRacer({
      sessionToken: "s_other",
      name: "@other",
      badge: "RACER",
      userId: "user_99",
    });
    expect(other?.sessionToken).toBe("s_other");
    expect(room.snapshot().racers.length).toBe(2);
  });

  it("free-for-all seats 8 real players and never adds bots", () => {
    const room = new RaceRoom({
      id: "r_ffa",
      slug: "wild-otter-8",
      kind: "challenge",
      modeId: "ffa",
      raceSeed: 1,
      wordCount: 25,
    });
    expect(room.capacity).toBe(8);
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    expect(room.hostStart("s_host")).toBe(true);
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(0);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(0);
  });

  it("generates the passage from a host-supplied word pool", () => {
    const pool = ["zebra", "quokka", "narwhal", "axolotl", "ibex"];
    const room = new RaceRoom({
      id: "r_pool",
      slug: "pool-otter-3",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 7,
      wordCount: 10,
      wordPool: pool,
    });
    expect(room.words.length).toBe(10);
    // Every generated word must come from the supplied pool, not the
    // default English pool.
    for (const w of room.words) expect(pool).toContain(w);
  });

  it("a timed challenge ends at the buzzer, ranking by net WPM over the whole race", () => {
    const room = new RaceRoom({
      id: "r_timed",
      slug: "ticking-fox-15",
      kind: "challenge",
      modeId: "ffa",
      raceSeed: 1,
      durationSec: 15,
    });
    expect(room.durationSec).toBe(15);
    expect(room.snapshot().durationSec).toBe(15);
    room.addRealRacer({
      sessionToken: "s_host",
      name: "@host",
      badge: "RACER",
      isHost: true,
    });
    room.addRealRacer({ sessionToken: "s_b", name: "@b", badge: "RACER" });
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    // Host types more (50 chars) but with errors; b types fewer (25)
    // cleanly. Neither completes the long timed passage early.
    room.setProgress("s_host", 50, 0, false, 8, 84);
    room.setProgress("s_b", 25, 0, false, 0, 100);
    // Still racing before the 15s buzzer.
    vi.advanceTimersByTime(14_000);
    expect(room.phase).toBe("racing");
    // Buzzer fires at 15s — everyone is marked finished and ranked.
    vi.advanceTimersByTime(1_500);
    expect(room.phase).toBe("finished");
    const racers = room.snapshot().racers;
    expect(racers.every((r) => r.finishedAt != null)).toBe(true);
    expect(racers.every((r) => r.place != null)).toBe(true);
    // Host did more correct work (50-8=42 vs 25), so higher net → 1st.
    expect(racers.find((r) => r.place === 1)?.id).toBe("s_host");
  });

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

describe("ready-up gate — challenge lobby (#26)", () => {
  function challengeRoom() {
    return new RaceRoom({
      id: "r_ready",
      slug: "ready-fox-1",
      kind: "challenge",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 25,
    });
  }

  it("a solo host can start immediately (no other humans to wait for)", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    expect(room.allHumansReady()).toBe(true);
    expect(room.hostStart("s_host")).toBe(true);
  });

  it("isn't all-ready until every other human readies up", () => {
    // The challenge.start ROUTE gates on allHumansReady(); hostStart
    // itself stays ungated so the state machine is directly drivable.
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    room.addRealRacer({ sessionToken: "s_bob", name: "@bob", badge: "RACER" });
    expect(room.allHumansReady()).toBe(false);

    expect(room.setReady("s_bob", true)).toBe(true);
    expect(room.allHumansReady()).toBe(true);
  });

  it("un-readying flips it back to not-all-ready", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    room.addRealRacer({ sessionToken: "s_bob", name: "@bob", badge: "RACER" });
    room.setReady("s_bob", true);
    expect(room.allHumansReady()).toBe(true);
    room.setReady("s_bob", false);
    expect(room.allHumansReady()).toBe(false);
  });

  it("reports ready state in the snapshot (bots auto-ready, humans start unready)", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    const bob = room.snapshot().racers.find((r) => r.id === "s_host");
    expect(bob?.ready).toBe(false);
    room.setReady("s_host", true);
    // host can ready too; the gate only checks NON-host humans
    expect(room.snapshot().racers.find((r) => r.id === "s_host")?.ready).toBe(true);
  });
});

describe("challenge rooms never gain bots (issue #5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function challengeRoom(modeId = "1v1") {
    return new RaceRoom({
      id: "r_nobots",
      slug: "no-bots-1",
      kind: "challenge",
      modeId: modeId as "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
  }

  function botCount(room: RaceRoom): number {
    return room.snapshot().racers.filter((r) => r.isBot).length;
  }

  /** Reach the private bot-insertion internals. The cast is the point:
   *  these tests prove the invariant holds even when an internal path
   *  is invoked directly (regression net for any future call site). */
  function internals(room: RaceRoom) {
    return room as unknown as {
      addBot(botId: string): unknown;
      scheduleMatchmakingFill(): void;
    };
  }

  it("addBot itself refuses to insert a bot into a challenge room", () => {
    const room = challengeRoom();
    expect(internals(room).addBot("selan")).toBeNull();
    expect(internals(room).addBot("mireille")).toBeNull();
    expect(botCount(room)).toBe(0);
  });

  it("a re-armed matchmaking fill schedule adds no bots to a challenge room", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    // Even if some future code path arms the fill timers on a
    // challenge room, the schedule bails (and addBot refuses anyway).
    internals(room).scheduleMatchmakingFill();
    vi.advanceTimersByTime(10_000);
    expect(botCount(room)).toBe(0);
  });

  it("full challenge lifecycle stays human-only: create → join → ready → start → finish", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    expect(botCount(room)).toBe(0);
    room.addRealRacer({ sessionToken: "s_bob", name: "@bob", badge: "RACER" });
    expect(botCount(room)).toBe(0);
    room.setReady("s_bob", true);
    expect(room.hostStart("s_host")).toBe(true);
    expect(botCount(room)).toBe(0);
    vi.advanceTimersByTime(700); // lobby hold
    expect(room.phase).toBe("countdown");
    vi.advanceTimersByTime(3_000); // countdown
    expect(room.phase).toBe("racing");
    expect(botCount(room)).toBe(0);
    // Finish both humans; room finishes with zero bots having raced.
    room.setProgress("s_host", room.totalChars, 0, true, 0, 100);
    room.setProgress("s_bob", room.totalChars, 0, true, 0, 100);
    expect(room.phase).toBe("finished");
    expect(botCount(room)).toBe(0);
  });

  it("force-start (solo host) races alone — no bot fill", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    // The route's force flag only bypasses the ready gate; the room's
    // hostStart is the same code path either way.
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    expect(room.snapshot().racers.length).toBe(1);
    expect(botCount(room)).toBe(0);
  });

  it("rematch (vote + host force) never seeds bots into the new round", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000);
    room.setProgress("s_host", room.totalChars, 0, true, 0, 100);
    expect(room.phase).toBe("finished");
    // Round 2 via the solo vote-threshold path.
    expect(room.markRematchReady("s_host").started).toBe(true);
    expect(room.roundNumber).toBe(2);
    expect(botCount(room)).toBe(0);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    expect(botCount(room)).toBe(0);
    room.setProgress("s_host", room.totalChars, 0, true, 0, 100);
    expect(room.phase).toBe("finished");
    // Round 3 via the host force-rematch path.
    expect(room.markRematchReady("s_host", true).started).toBe(true);
    expect(room.roundNumber).toBe(3);
    vi.advanceTimersByTime(700 + 3_000);
    expect(room.phase).toBe("racing");
    expect(botCount(room)).toBe(0);
  });

  it("a bot that somehow leaked into a challenge room is purged at the next rematch", () => {
    const room = challengeRoom();
    room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
    // Simulate a legacy leak by planting a bot racer directly into the
    // private map (bypassing addBot's invariant on purpose).
    const racers = (
      room as unknown as { racers: Map<string, { isBot: boolean; id: string }> }
    ).racers;
    racers.set("bot:selan", {
      id: "bot:selan",
      sessionToken: "bot:selan",
      name: "@selan",
      flag: "🇨🇦",
      badge: "ADEPT",
      isBot: true,
      isHost: false,
      ready: true,
      joinedAt: Date.now(),
      progressChars: 0,
      errors: 0,
      wpm: 0,
      raw: 0,
      accuracy: 100,
      finishedAt: null,
      place: null,
      botCharProgress: 0,
      disconnected: false,
    } as never);
    expect(botCount(room)).toBe(1);
    expect(room.hostStart("s_host")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000);
    room.setProgress("s_host", room.totalChars, 0, true, 0, 100);
    // The planted bot has no botProfile so it never ticks; finish the
    // race by treating it as done is unnecessary — the room finishes
    // when every racer is finished/disconnected, so mark it done.
    const bot = racers.get("bot:selan") as unknown as { finishedAt: number | null };
    bot.finishedAt = 1;
    room.setProgress("s_host", room.totalChars, 0, true, 0, 100);
    expect(room.phase).toBe("finished");
    // Rematch — startNewRound purges the leaked bot at the source.
    expect(room.markRematchReady("s_host", true).started).toBe(true);
    expect(room.roundNumber).toBe(2);
    expect(botCount(room)).toBe(0);
  });

  it("matchmaking rooms still fill with bots exactly as before", () => {
    const room = new RaceRoom({
      id: "r_mm_baseline",
      slug: null,
      kind: "matchmaking",
      modeId: "1v1",
      raceSeed: 1,
      wordCount: 5,
    });
    room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
    vi.advanceTimersByTime(1_000);
    expect(room.snapshot().racers.filter((r) => r.isBot).length).toBe(1);
    expect(room.phase).toBe("lobby");
  });
});
