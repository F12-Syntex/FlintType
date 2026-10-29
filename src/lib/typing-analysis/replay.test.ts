import { describe, expect, it } from "vitest";
import type { RunContext } from "@/types/capture";
import { aliveIn, applyStep, lenOf, newReplay, prefixOf, replayOrder, replayRun } from "./replay";
import { steady, stopOnError, withMistake } from "./run-script";
import { noTruth, render, type Act } from "./run-script-core";
import { buildTimeline } from "./timeline";

/** Keys "a".."z" as chars, " " as Space, "<" as Backspace, "^" as Ctrl+Backspace, 100 ms apart. */
function typed(words: string[], keys: string, ctx: RunContext = {}) {
  const acts: Act[] = [...keys].map((c, i) =>
    c === " " ? { k: "space", t: i * 100 } : c === "<" ? { k: "back", t: i * 100 } : c === "^" ? { k: "back", t: i * 100, word: true } : { k: "char", t: i * 100, ch: c });
  return render({ words, acts, ctx, lengthMode: "time", T: keys.length * 100, truth: noTruth() });
}
const replay = (r: ReturnType<typeof typed>) => replayRun(buildTimeline(r), r.words);

describe("replayRun", () => {
  it("backspaces rebuild typed exactly", () => {
    const r = typed(["hello", "world"], "hwl<<ello wpr<<orld");
    const rep = replay(r);
    expect(rep.mismatches).toBe(0);
    expect(rep.ok).toBe(true);
    expect(rep.typed).toEqual(["hello", "world"]);
    expect(rep.typed).toEqual(r.typedFinal);
  });

  it("a crossing Backspace moves into the previous word without deleting", () => {
    const r = typed(["hello", "world"], "helo <<lo wo");
    const rep = replay(r);
    expect(r.edits!.map((e) => e.cross ?? false)).toEqual([true, false]);
    expect(rep.mismatches).toBe(0);
    expect(rep.typed).toEqual(["hello", "wo"]);
  });

  it("Ctrl+Backspace wipes the word, mid-word and across into the previous word", () => {
    const mid = typed(["hello", "world"], "hexx^hello wor");
    expect(replay(mid).typed).toEqual(["hello", "wor"]);
    const cross = typed(["hello", "world"], "hexlo ^hello wor");
    expect(cross.edits![0]!.cross).toBe(true);
    const rep = replay(cross);
    expect(rep.mismatches).toBe(0);
    expect(rep.typed).toEqual(["hello", "wor"]);
  });

  it("stop on error leaves the buffer unchanged, then Backspace or Space replay cleanly", () => {
    const blocked = withMistake(stopOnError(steady(["alpha", "bravo", "charlie"])), { word: 1, pos: 2, noticeAfter: 2 });
    const rep = replayRun(buildTimeline(blocked), blocked.words);
    expect(rep.mismatches).toBe(0);
    expect(rep.typed).toEqual(["alpha", "bravo", "charlie"]);
    const back = typed(["alpha", "bravo"], "alx<pha bra", { stopOnError: true });
    expect(replay(back).mismatches).toBe(0);
    expect(replay(back).typed).toEqual(back.typedFinal);
    const space = typed(["alpha", "bravo"], "alx bravo", { stopOnError: true });
    expect(replay(space).mismatches).toBe(0);
    expect(replay(space).typed).toEqual(["al", "bravo"]);
  });

  it("stop on error with backspace off still replays as blocked", () => {
    const r = typed(["alpha", "bravo"], "alxpha brxavo", { stopOnError: true, confidence: "all" });
    const rep = replay(r);
    expect(rep.mismatches).toBe(0);
    expect(rep.typed).toEqual(["alpha", "bravo"]);
  });

  it("more than 2% mismatches fails the integrity check", () => {
    const r = typed(["hello", "world"], "hello world");
    const bad = { ...r, timings: r.timings.map((e, i) => (i === 7 ? { ...e, pos: 4 } : e)) };
    const rep = replayRun(buildTimeline(bad), bad.words);
    expect(rep.mismatches).toBeGreaterThan(0);
    expect(rep.ok).toBe(false);
  });

  it("a record can't move the cursor past the words its Space marks reach", () => {
    const r = typed(["hello", "world"], "hello world");
    for (const wordIndex of [2, 99_999]) {
      const far = { ...r, timings: r.timings.map((e, i) => (i === 7 ? { ...e, wordIndex } : e)) };
      const rep = replayRun(buildTimeline(far), far.words);
      expect(rep.mismatches).toBeGreaterThan(0);
      // One Space: at most words 0 and 1 have a slot.
      expect(rep.typed.length).toBeLessThanOrEqual(2);
    }
    const spaceFar = { ...r, spaces: r.spaces!.map((m) => ({ ...m, wordIndex: 50_000 })) };
    const rep = replayRun(buildTimeline(spaceFar), spaceFar.words);
    expect(rep.mismatches).toBeGreaterThan(0);
    expect(rep.typed.length).toBeLessThanOrEqual(2);
  });

  it("buffer helpers: length, prefix test and alive counts follow every edit", () => {
    const r = typed(["hello", "world"], "hexxx<<<llo wor^wo");
    const tl = buildTimeline(r);
    const st = newReplay(tl);
    for (const step of replayOrder(tl)) applyStep(st, tl, step);
    expect([lenOf(st, 0), lenOf(st, 1), lenOf(st, 7)]).toEqual([5, 2, 0]);
    expect(prefixOf(st, 0, "hello")).toBe(true);
    expect(prefixOf(st, 0, "hell")).toBe(false);
    expect(prefixOf(st, 1, "world")).toBe(true);
    expect(prefixOf(st, 7, "x")).toBe(true);
    // h e (x x x popped) l l o | w o r wiped | w o
    expect(aliveIn(st, 0, tl.K - 1)).toBe(7);
    expect(aliveIn(st, 2, 4)).toBe(0);
    expect(aliveIn(st, -5, 1)).toBe(2);
    expect(aliveIn(st, 9, 3)).toBe(0);
  });
});
