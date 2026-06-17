import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceRoom, type RoomOptions } from "./room";

/** Edge-case + lifecycle suite for the race room, organised around the
 *  open-lobby model: a challenge room is an open lobby that stays alive
 *  as long as someone is present, ownership transfers when the host
 *  leaves, and seats are reclaimed cleanly across leaves / rejoins /
 *  rematches.
 *
 *  Fake timers throughout so the matchmaking window, lobby hold,
 *  countdown, bot tick, and the 30-min challenge idle GC all play out
 *  under our control. The core state-machine timeline (matching →
 *  lobby → countdown → racing → finished) is covered in `room.test.ts`;
 *  this file focuses on the corner behaviours. */

/** CHALLENGE_HOST_IDLE_TTL_MS in room.ts — kept in sync here so the
 *  persistence assertions read against the real window. */
const IDLE_TTL = 30 * 60_000;

describe("RaceRoom — edge cases & open-lobby lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  let seq = 0;
  /** A challenge room (open lobby, no auto-fill, no bots). Defaults to
   *  FFA so most tests can seat many real racers without a bot lineup
   *  filling seats; pass `modeId` to exercise small capacities. */
  function challenge(overrides: Partial<RoomOptions> = {}): RaceRoom {
    seq += 1;
    return new RaceRoom({
      id: `r_edge_${seq}`,
      slug: `edge-otter-${seq}`,
      kind: "challenge",
      modeId: "ffa",
      raceSeed: 1,
      wordCount: 25,
      ...overrides,
    });
  }

  /* ─── 1 · A user joining their own race ─────────────────────── */

  describe("1 · a user joining their own race", () => {
    it("a signed-in user re-opening their own link resumes their seat (no clone)", () => {
      const room = challenge();
      const host = room.addRealRacer({
        sessionToken: "s_host",
        name: "@me",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      expect(host).not.toBeNull();
      // Same Clerk user, fresh session token (second tab / re-open).
      const tab2 = room.addRealRacer({
        sessionToken: "s_host_tab2",
        name: "@me",
        badge: "RACER",
        userId: "user_1",
      });
      expect(tab2?.sessionToken).toBe("s_host");
      expect(room.snapshot().racers).toHaveLength(1);
    });

    it("the resumed seat keeps the host bit — a second tab can't spawn a second host", () => {
      const room = challenge();
      room.addRealRacer({
        sessionToken: "s_host",
        name: "@me",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      room.addRealRacer({
        sessionToken: "s_host_tab2",
        name: "@me",
        badge: "RACER",
        userId: "user_1",
      });
      const snap = room.snapshot();
      expect(snap.racers.filter((r) => r.isHost)).toHaveLength(1);
      expect(snap.racers.find((r) => r.id === "s_host")?.isHost).toBe(true);
    });

    it("guests are NOT deduped — anonymous joiners each get a distinct seat", () => {
      const room = challenge();
      room.addRealRacer({ sessionToken: "s_g1", name: "Guest · ABC", badge: "GUEST" });
      room.addRealRacer({ sessionToken: "s_g2", name: "Guest · XYZ", badge: "GUEST" });
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("distinct signed-in users get distinct seats", () => {
      const room = challenge();
      const a = room.addRealRacer({
        sessionToken: "s_a",
        name: "@a",
        badge: "RACER",
        userId: "user_1",
      });
      const b = room.addRealRacer({
        sessionToken: "s_b",
        name: "@b",
        badge: "RACER",
        userId: "user_2",
      });
      expect(a?.sessionToken).toBe("s_a");
      expect(b?.sessionToken).toBe("s_b");
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("resuming an own seat clears a stale disconnected flag", () => {
      const room = challenge();
      room.addRealRacer({
        sessionToken: "s_host",
        name: "@me",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      room.addRealRacer({ sessionToken: "s_other", name: "@o", badge: "RACER", userId: "user_2" });
      room.hostStart("s_host");
      vi.advanceTimersByTime(700 + 3_000);
      expect(room.phase).toBe("racing");
      room.removeRacer("s_host"); // mid-race → disconnected (host bit migrates)
      expect(room.snapshot().racers.find((r) => r.id === "s_host")?.disconnected).toBe(true);
      // Same user comes back under a new token → resumes the seat, live again.
      const back = room.addRealRacer({
        sessionToken: "s_host_back",
        name: "@me",
        badge: "RACER",
        userId: "user_1",
      });
      expect(back?.sessionToken).toBe("s_host");
      expect(room.snapshot().racers.find((r) => r.id === "s_host")?.disconnected).toBe(false);
    });
  });

  /* ─── 2 · Joining beyond capacity ───────────────────────────── */

  describe("2 · joining beyond capacity", () => {
    it("FFA seats exactly 8 real players; the 9th is refused (→ spectator at the route)", () => {
      const room = challenge({ modeId: "ffa" });
      expect(room.capacity).toBe(8);
      for (let i = 0; i < 8; i += 1) {
        const r = room.addRealRacer({
          sessionToken: `s_${i}`,
          name: `@p${i}`,
          badge: "RACER",
          isHost: i === 0,
          userId: `user_${i}`,
        });
        expect(r).not.toBeNull();
      }
      const ninth = room.addRealRacer({
        sessionToken: "s_9",
        name: "@p9",
        badge: "RACER",
        userId: "user_9",
      });
      expect(ninth).toBeNull();
      expect(room.snapshot().racers).toHaveLength(8);
    });

    it("a 1v1 challenge refuses a third real joiner even while still in lobby", () => {
      const room = challenge({ modeId: "1v1" });
      expect(room.capacity).toBe(2);
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_guest", name: "@guest", badge: "RACER" });
      expect(room.canJoinAsReal()).toBe(false);
      const third = room.addRealRacer({ sessionToken: "s_third", name: "@third", badge: "RACER" });
      expect(third).toBeNull();
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("a known user at capacity still resumes their existing seat (dedup beats the capacity gate)", () => {
      const room = challenge({ modeId: "1v1" });
      room.addRealRacer({
        sessionToken: "s_host",
        name: "@host",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      room.addRealRacer({ sessionToken: "s_guest", name: "@guest", badge: "RACER", userId: "user_2" });
      // Room is full. The host's second tab must still resume, not bounce
      // off the capacity wall (the dedup check runs before canJoinAsReal).
      const resume = room.addRealRacer({
        sessionToken: "s_host_tab2",
        name: "@host",
        badge: "RACER",
        userId: "user_1",
      });
      expect(resume?.sessionToken).toBe("s_host");
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("joins are refused once the lobby advances past lobby/matching (countdown onward)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700); // lobby hold elapses → countdown
      expect(room.phase).toBe("countdown");
      expect(room.canJoinAsReal()).toBe(false);
      expect(
        room.addRealRacer({ sessionToken: "s_late", name: "@late", badge: "RACER" }),
      ).toBeNull();
    });
  });

  /* ─── 3 · An idle lobby stays open while a viewer is present ─── */

  describe("3 · open-lobby persistence", () => {
    it("a connected viewer keeps a challenge lobby alive far past the idle window", () => {
      let idle = false;
      const room = challenge({ onIdle: () => { idle = true; } });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      const unsub = room.subscribe(() => {});
      // Three full idle windows pass with the host's SSE connection open.
      vi.advanceTimersByTime(IDLE_TTL * 3 + 1_000);
      expect(idle).toBe(false);
      expect(room.snapshot().racers.find((r) => r.id === "s_host")).toBeDefined();
      // Host closes the tab → SSE severs → no live connections. Now the
      // safety net reclaims the abandoned room after the window.
      unsub();
      vi.advanceTimersByTime(IDLE_TTL * 2 + 1_000);
      expect(idle).toBe(true);
    });

    it("a challenge lobby that nobody ever connects to is reclaimed after the idle window", () => {
      let idle = false;
      const room = challenge({ onIdle: () => { idle = true; } });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      expect(idle).toBe(false);
      vi.advanceTimersByTime(IDLE_TTL + 1_000);
      expect(idle).toBe(true);
    });

    it("late joiners can still take a seat in a long-idle but still-connected lobby", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({
        sessionToken: "s_host",
        name: "@host",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      room.subscribe(() => {});
      vi.advanceTimersByTime(IDLE_TTL * 2 + 1_000); // lobby sits open a long time
      expect(room.phase).toBe("lobby");
      const late = room.addRealRacer({
        sessionToken: "s_late",
        name: "@late",
        badge: "RACER",
        userId: "user_2",
      });
      expect(late).not.toBeNull();
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("the keep-alive does NOT leak to matchmaking rooms (they keep their fixed post-finish GC)", () => {
      let idle = false;
      const room = new RaceRoom({
        id: "r_mm_gc",
        slug: null,
        kind: "matchmaking",
        modeId: "1v1",
        raceSeed: 1,
        wordCount: 5,
        onIdle: () => { idle = true; },
      });
      room.addRealRacer({ sessionToken: "s_alice", name: "@alice", badge: "RACER" });
      room.subscribe(() => {}); // a live connection must NOT keep it alive
      vi.advanceTimersByTime(1_000 + 700 + 3_000); // → racing
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_alice", room.totalChars, 100, true);
      vi.advanceTimersByTime(30_000); // bot finishes → finished, 5-min GC armed
      expect(room.phase).toBe("finished");
      vi.advanceTimersByTime(5 * 60_000 + 1_000);
      expect(idle).toBe(true);
    });
  });

  /* ─── 4 · Leaving then rejoining ────────────────────────────── */

  describe("4 · leaving then rejoining", () => {
    it("a guest who leaves pre-race frees the seat; rejoining mints a fresh one", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "Guest · ABC", badge: "GUEST" });
      expect(room.snapshot().racers).toHaveLength(2);
      room.removeRacer("s_g");
      expect(room.snapshot().racers.find((r) => r.id === "s_g")).toBeUndefined();
      const back = room.addRealRacer({ sessionToken: "s_g_2", name: "Guest · ABC", badge: "GUEST" });
      expect(back?.sessionToken).toBe("s_g_2");
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("a mid-race leaver rejoining under the SAME token resumes their seat (disconnected cleared)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      expect(room.phase).toBe("racing");
      room.removeRacer("s_g");
      expect(room.snapshot().racers.find((r) => r.id === "s_g")?.disconnected).toBe(true);
      const back = room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(back).not.toBeNull();
      expect(room.snapshot().racers.find((r) => r.id === "s_g")?.disconnected).toBe(false);
    });

    it("a signed-in mid-race leaver rejoining under a NEW token still resumes their seat (userId match)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({
        sessionToken: "s_host",
        name: "@host",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER", userId: "user_2" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      room.removeRacer("s_g");
      expect(room.snapshot().racers.find((r) => r.id === "s_g")?.disconnected).toBe(true);
      const back = room.addRealRacer({
        sessionToken: "s_g_new",
        name: "@g",
        badge: "RACER",
        userId: "user_2",
      });
      expect(back?.sessionToken).toBe("s_g");
      expect(room.snapshot().racers.find((r) => r.id === "s_g")?.disconnected).toBe(false);
      expect(room.snapshot().racers.find((r) => r.id === "s_g_new")).toBeUndefined();
    });

    it("a host who leaves and rejoins comes back as a regular racer (ownership already moved on)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({
        sessionToken: "s_host",
        name: "@host",
        badge: "RACER",
        isHost: true,
        userId: "user_1",
      });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER", userId: "user_2" });
      room.removeRacer("s_host"); // pre-race leave → seat dropped, guest promoted
      expect(room.snapshot().racers.find((r) => r.id === "s_g")?.isHost).toBe(true);
      const back = room.addRealRacer({
        sessionToken: "s_host_back",
        name: "@host",
        badge: "RACER",
        userId: "user_1",
      });
      expect(back).not.toBeNull();
      expect(back?.isHost).toBe(false);
      const snap = room.snapshot();
      expect(snap.racers.filter((r) => r.isHost)).toHaveLength(1);
      expect(snap.racers.find((r) => r.isHost)?.id).toBe("s_g");
    });
  });

  /* ─── 5 · Ownership transfer & seat cleanup ─────────────────── */

  describe("5 · ownership transfer & cleanup", () => {
    it("host migration skips disconnected racers and picks the longest-tenured connected one", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      vi.advanceTimersByTime(10);
      room.addRealRacer({ sessionToken: "s_b", name: "@b", badge: "RACER" });
      vi.advanceTimersByTime(10);
      room.addRealRacer({ sessionToken: "s_c", name: "@c", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      expect(room.phase).toBe("racing");
      // s_b (the would-be successor by tenure) disconnects first…
      room.removeRacer("s_b");
      // …then the host leaves. s_b is disconnected → skipped; s_c inherits.
      room.removeRacer("s_host");
      const snap = room.snapshot();
      expect(snap.racers.find((r) => r.id === "s_c")?.isHost).toBe(true);
      expect(snap.racers.filter((r) => r.isHost)).toHaveLength(1);
    });

    it("ownership migrates down a chain of leavers until the room empties out", () => {
      let idle = false;
      const room = challenge({ modeId: "ffa", onIdle: () => { idle = true; } });
      room.addRealRacer({ sessionToken: "s_a", name: "@a", badge: "RACER", isHost: true });
      vi.advanceTimersByTime(5);
      room.addRealRacer({ sessionToken: "s_b", name: "@b", badge: "RACER" });
      vi.advanceTimersByTime(5);
      room.addRealRacer({ sessionToken: "s_c", name: "@c", badge: "RACER" });
      room.removeRacer("s_a");
      expect(room.snapshot().racers.find((r) => r.id === "s_b")?.isHost).toBe(true);
      room.removeRacer("s_b");
      expect(room.snapshot().racers.find((r) => r.id === "s_c")?.isHost).toBe(true);
      expect(idle).toBe(false);
      room.removeRacer("s_c"); // last real out → room disposes
      expect(idle).toBe(true);
    });

    it("a rematch purges a disconnected ghost and frees its seat", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      expect(room.phase).toBe("racing");
      room.removeRacer("s_g"); // mid-race → disconnected, kept in snapshot
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true); // host finishes
      expect(room.phase).toBe("finished");
      expect(room.snapshot().racers.find((r) => r.id === "s_g")?.disconnected).toBe(true);
      const res = room.markRematchReady("s_host"); // 1 connected real → instant
      expect(res.started).toBe(true);
      expect(room.snapshot().racers.find((r) => r.id === "s_g")).toBeUndefined();
      expect(room.snapshot().racers.find((r) => r.id === "s_host")).toBeDefined();
    });

    it("after a rematch purge, a fresh player can take the freed seat", () => {
      const room = challenge({ modeId: "1v1" }); // capacity 2
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      room.removeRacer("s_g"); // disconnected — still holds a seat at capacity
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true);
      expect(room.phase).toBe("finished");
      room.markRematchReady("s_host"); // → lobby, ghost purged
      expect(room.phase).toBe("lobby");
      expect(room.snapshot().racers).toHaveLength(1);
      const fresh = room.addRealRacer({ sessionToken: "s_new", name: "@new", badge: "RACER" });
      expect(fresh).not.toBeNull();
      expect(room.snapshot().racers).toHaveLength(2);
    });

    it("the host survives a rematch (exactly one host, and it stays them)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true);
      room.setProgress("s_g", room.totalChars, 100, true);
      expect(room.phase).toBe("finished");
      room.markRematchReady("s_host");
      const res = room.markRematchReady("s_g"); // two reals → needs both votes
      expect(res.started).toBe(true);
      const snap = room.snapshot();
      expect(snap.racers.filter((r) => r.isHost)).toHaveLength(1);
      expect(snap.racers.find((r) => r.isHost)?.id).toBe("s_host");
    });

    it("a two-real rematch needs both votes before the new round starts", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true);
      room.setProgress("s_g", room.totalChars, 100, true);
      expect(room.phase).toBe("finished");
      const first = room.markRematchReady("s_host");
      expect(first.started).toBe(false);
      expect(room.phase).toBe("finished");
      expect(room.snapshot().rematchReady).toContain("s_host");
      const second = room.markRematchReady("s_g");
      expect(second.started).toBe(true);
      expect(room.roundNumber).toBe(2);
    });

    it("the host can force-rematch without waiting on other votes", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true);
      room.setProgress("s_g", room.totalChars, 100, true);
      expect(room.phase).toBe("finished");
      // The guest never votes — host forces the next round.
      const res = room.markRematchReady("s_host", true);
      expect(res.started).toBe(true);
      expect(room.phase).toBe("lobby");
      expect(room.roundNumber).toBe(2);
    });

    it("force is ignored from a non-host caller (still needs the threshold)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true);
      room.setProgress("s_g", room.totalChars, 100, true);
      expect(room.phase).toBe("finished");
      // A guest passing force=true gets no override — two-real rooms
      // still need both votes.
      const res = room.markRematchReady("s_g", true);
      expect(res.started).toBe(false);
      expect(room.phase).toBe("finished");
      expect(room.roundNumber).toBe(1);
    });
  });

  /* ─── 6 · Misc robustness ───────────────────────────────────── */

  describe("6 · misc robustness", () => {
    it("removeRacer with an unknown / empty token is a harmless no-op", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      expect(() => room.removeRacer("")).not.toThrow();
      expect(() => room.removeRacer("s_nope")).not.toThrow();
      expect(room.snapshot().racers).toHaveLength(1);
    });

    it("hostStart is rejected once the race has already finished", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true);
      expect(room.phase).toBe("finished");
      expect(room.hostStart("s_host")).toBe(false);
    });

    it("setProgress is ignored before the gun (pre-race lobby)", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      expect(room.setProgress("s_host", 5, 60, false)).toBe(false);
      expect(room.snapshot().racers.find((r) => r.id === "s_host")?.progressChars).toBe(0);
    });

    it("a disconnected racer never blocks the room from finishing", () => {
      const room = challenge({ modeId: "ffa" });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      room.removeRacer("s_g"); // disconnected
      vi.advanceTimersByTime(10_000); // anti-cheat clamp admits the passage (FT-030)
      room.setProgress("s_host", room.totalChars, 100, true); // host finishes
      expect(room.phase).toBe("finished");
    });

    it("a non-host leaving mid-race keeps the room alive for the host", () => {
      let idle = false;
      const room = challenge({ modeId: "ffa", onIdle: () => { idle = true; } });
      room.addRealRacer({ sessionToken: "s_host", name: "@host", badge: "RACER", isHost: true });
      room.addRealRacer({ sessionToken: "s_g", name: "@g", badge: "RACER" });
      expect(room.hostStart("s_host")).toBe(true);
      vi.advanceTimersByTime(700 + 3_000);
      room.removeRacer("s_g");
      expect(idle).toBe(false);
      expect(room.snapshot().cancelled).toBeUndefined();
      expect(room.snapshot().racers.find((r) => r.id === "s_host")?.isHost).toBe(true);
    });
  });
});
