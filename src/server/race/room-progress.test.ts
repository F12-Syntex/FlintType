import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceRoom } from "./room";

/** Progress posts are fire-and-forget and can land out of order, so the
 *  room is the authority on what counts: progress only moves forward
 *  within an attempt (a mid-race restart starts it over), a racer
 *  finishes on the post that both reaches the end and says finished, and
 *  a finished racer's figures are final. Fake timers so the gun, the
 *  anti-cheat window and the buzzer are exact. */

describe("RaceRoom — progress ordering and frozen finishes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  let seq = 0;
  /** A two-human challenge that is racing, so one racer can finish while
   *  the room keeps going. */
  function racingRoom(opts: { wordCount?: number; durationSec?: number } = {}) {
    seq += 1;
    const room = new RaceRoom({
      id: `r_prog_${seq}`,
      slug: `prog-otter-${seq}`,
      kind: "challenge",
      modeId: "ffa",
      raceSeed: 1,
      wordCount: opts.wordCount ?? 5,
      durationSec: opts.durationSec,
    });
    room.addRealRacer({
      sessionToken: "s_a",
      name: "@a",
      badge: "RACER",
      isHost: true,
    });
    room.addRealRacer({ sessionToken: "s_b", name: "@b", badge: "RACER" });
    expect(room.hostStart("s_a")).toBe(true);
    vi.advanceTimersByTime(700 + 3_000); // lobby hold + countdown
    expect(room.phase).toBe("racing");
    return room;
  }

  const racer = (room: RaceRoom, id: string) => {
    const r = room.snapshot().racers.find((x) => x.id === id);
    if (!r) throw new Error(`no racer ${id}`);
    return r;
  };

  it("a lower progress count never moves a racer backwards", () => {
    const room = racingRoom({ wordCount: 50 });
    vi.advanceTimersByTime(5_000);
    room.setProgress("s_a", 40, 0, false, 1, 97.5);
    // An older post (fewer chars, same error count) lands late.
    room.setProgress("s_a", 25, 0, false, 1, 96);
    const a = racer(room, "s_a");
    expect(a.progressChars).toBe(40);
    // wpm is still computed from the furthest point reached.
    expect(a.wpm).toBe(Math.round(((40 - 1) / 5) * (60 / 5)));
  });

  it("forward progress still lands after a late lower post", () => {
    const room = racingRoom({ wordCount: 50 });
    vi.advanceTimersByTime(5_000);
    room.setProgress("s_a", 40, 0, false, 0, 100);
    room.setProgress("s_a", 30, 0, false, 0, 100);
    room.setProgress("s_a", 45, 0, false, 0, 100);
    expect(racer(room, "s_a").progressChars).toBe(45);
  });

  it("errors and accuracy are the latest post's running totals", () => {
    const room = racingRoom({ wordCount: 50 });
    vi.advanceTimersByTime(5_000);
    room.setProgress("s_a", 40, 0, false, 3, 92);
    room.setProgress("s_a", 44, 0, false, 3, 93.2);
    room.setProgress("s_a", 46, 0, false, 4, 91);
    const a = racer(room, "s_a");
    expect(a.errors).toBe(4);
    expect(a.accuracy).toBe(91);
    expect(a.wpm).toBe(Math.round(((46 - 4) / 5) * (60 / 5)));
  });

  it("a mid-race restart (Esc) and a clean finish report the new attempt", () => {
    const room = racingRoom({ wordCount: 10 });
    vi.advanceTimersByTime(5_000);
    // A sloppy first attempt, then Esc: the client's counters start over.
    room.setProgress("s_a", 20, 0, false, 8, 71.4);
    room.setProgress("s_a", 0, 0, false, 0, 100);
    const restarted = racer(room, "s_a");
    expect(restarted.progressChars).toBe(0);
    expect(restarted.errors).toBe(0);
    expect(restarted.accuracy).toBe(100);
    // A clean second attempt to the end, with one slip.
    vi.advanceTimersByTime(10_000);
    const total = room.totalChars;
    expect(room.setProgress("s_a", total, 0, true, 1, 98.5)).toBe(true);
    const a = racer(room, "s_a");
    expect(a.finishedAt).toBe(15);
    expect(a.progressChars).toBe(total);
    expect(a.errors).toBe(1);
    expect(a.accuracy).toBe(98.5);
    expect(a.wpm).toBe(Math.round(((total - 1) / 5) * (60 / 15)));
  });

  it("a restart whose first post is already past the start still starts over", () => {
    // The client debounces its posts, so typing right after Esc can fold
    // the 0-char post into the next one. Fewer errors than the server
    // holds still marks the new attempt.
    const room = racingRoom({ wordCount: 50 });
    vi.advanceTimersByTime(5_000);
    room.setProgress("s_a", 60, 0, false, 6, 85);
    room.setProgress("s_a", 4, 0, false, 0, 100);
    const a = racer(room, "s_a");
    expect(a.progressChars).toBe(4);
    expect(a.errors).toBe(0);
    expect(a.accuracy).toBe(100);
    // The new attempt then moves forward as usual.
    room.setProgress("s_a", 12, 0, false, 1, 92.3);
    expect(racer(room, "s_a").progressChars).toBe(12);
  });

  it("backspacing to the very start puts the lane back at 0", () => {
    const room = racingRoom({ wordCount: 50 });
    vi.advanceTimersByTime(2_000);
    room.setProgress("s_a", 1, 0, false, 1, 0);
    room.setProgress("s_a", 0, 0, false, 1, 50);
    const a = racer(room, "s_a");
    expect(a.progressChars).toBe(0);
    expect(a.errors).toBe(1);
  });

  it("reaching the end without the finished flag does not finish the racer", () => {
    // The cursor count hits the end as soon as the last word is typed to
    // length, even with a wrong final letter. The client only finishes
    // on the correct keystroke, and the server waits for that post.
    const room = racingRoom({ wordCount: 10 });
    vi.advanceTimersByTime(8_000);
    const total = room.totalChars;
    expect(room.setProgress("s_a", total, 0, false, 1, 98)).toBe(true);
    expect(racer(room, "s_a").finishedAt).toBeNull();
    expect(room.phase).toBe("racing");
    // Backspace the wrong letter (the lane stays at the end), then type
    // it correctly: that post finishes the run, timed at the real finish.
    vi.advanceTimersByTime(1_500);
    room.setProgress("s_a", total - 1, 0, false, 1, 98);
    expect(racer(room, "s_a").progressChars).toBe(total);
    room.setProgress("s_a", total, 0, true, 1, 98.1);
    const a = racer(room, "s_a");
    expect(a.finishedAt).toBe(9);
    expect(a.place).toBe(1);
    expect(a.accuracy).toBe(98.1);
    expect(a.wpm).toBe(Math.round(((total - 1) / 5) * (60 / 9.5)));
  });

  it("a finished racer's figures stay frozen when an older post arrives after the finish", () => {
    const room = racingRoom();
    vi.advanceTimersByTime(4_000);
    const total = room.totalChars;
    expect(room.setProgress("s_a", total, 0, true, 2, 95)).toBe(true);
    const finished = racer(room, "s_a");
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.wpm).toBe(Math.round(((total - 2) / 5) * (60 / 4)));
    // b is still typing, so the room is still racing.
    expect(room.phase).toBe("racing");

    // Seconds later an older post (lower progress, fewer errors) lands.
    vi.advanceTimersByTime(3_000);
    expect(room.setProgress("s_a", total - 6, 0, false, 1, 98)).toBe(false);
    const after = racer(room, "s_a");
    expect(after.progressChars).toBe(total);
    expect(after.errors).toBe(2);
    expect(after.accuracy).toBe(95);
    expect(after.wpm).toBe(finished.wpm);
    expect(after.raw).toBe(finished.raw);
    expect(after.finishedAt).toBe(finished.finishedAt);
    expect(after.place).toBe(finished.place);
  });

  it("a repeated finishing post later on does not recompute (and lower) the wpm", () => {
    const room = racingRoom();
    vi.advanceTimersByTime(4_000);
    const total = room.totalChars;
    room.setProgress("s_a", total, 0, true, 0, 100);
    const wpm = racer(room, "s_a").wpm;
    vi.advanceTimersByTime(10_000);
    room.setProgress("s_a", total, 0, true, 0, 100);
    expect(racer(room, "s_a").wpm).toBe(wpm);
  });

  it("figures stay frozen after the race itself has finished", () => {
    const room = racingRoom();
    vi.advanceTimersByTime(4_000);
    const total = room.totalChars;
    room.setProgress("s_b", total, 0, true, 0, 100);
    room.setProgress("s_a", total, 0, true, 1, 99);
    expect(room.phase).toBe("finished");
    const before = racer(room, "s_a");
    vi.advanceTimersByTime(2_000);
    expect(room.setProgress("s_a", total - 3, 0, false, 0, 100)).toBe(false);
    expect(racer(room, "s_a")).toEqual(before);
  });

  it("the buzzer's figures for a timed race are final too", () => {
    const room = racingRoom({ durationSec: 15 });
    vi.advanceTimersByTime(2_000);
    room.setProgress("s_a", 50, 0, false, 5, 90);
    room.setProgress("s_b", 30, 0, false, 0, 100);
    vi.advanceTimersByTime(13_500); // past the 15s buzzer
    expect(room.phase).toBe("finished");
    const before = racer(room, "s_a");
    expect(before.finishedAt).not.toBeNull();
    // A post that was in flight at the buzzer lands afterwards.
    vi.advanceTimersByTime(1_000);
    expect(room.setProgress("s_a", 55, 0, false, 5, 90.5)).toBe(false);
    expect(racer(room, "s_a")).toEqual(before);
  });
});
