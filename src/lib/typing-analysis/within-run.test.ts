import { describe, expect, it } from "vitest";
import { countChars } from "@/lib/wpm";
import { analyseRun } from "./analyse";
import { asV1, steady, timeRun, withMistake, withPause } from "./run-script";
import { noTruth, render, type Act } from "./run-script-core";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field to find a quiet place".split(" ");

describe("word friction and pauses", () => {
  it("a word with one big pause ranks above a long clean word; the longest pause names the next word", () => {
    const words = [...WORDS.slice(0, 10), "extraordinarily", ...WORDS.slice(10, 20)];
    const a = analyseRun(withPause(steady(words), { beforeWord: 4, ms: 1500 }))!;
    expect(a.wordFriction[0]).toMatchObject({ word: "jumps", wordIndex: 4 });
    expect(a.wordFriction.some((f) => f.word === "extraordinarily")).toBe(false);
    expect(a.pauses.longest).toEqual({ ms: a.pauses.ms, word: "jumps" });
    expect(a.pauses.byLength[1]).toEqual([expect.any(Number), 1]);
  });

  it("catches name their word and letter pair", () => {
    const a = analyseRun(withPause(withPause(steady(WORDS), { insideWord: [2, 1], ms: 700 }), { insideWord: [2, 2], ms: 600 }))!;
    expect(a.catches.topWord).toBe("brown");
    expect(a.catches.pairs).toEqual([["ow", 1], ["ro", 1]]);
  });
});

describe("start-up", () => {
  it("is found when the first four words cost far more, and needs 12 words", () => {
    let r = steady(WORDS);
    for (const w of [0, 1, 2, 3]) r = withPause(r, { insideWord: [w, 0], ms: 900 });
    const a = analyseRun(r)!;
    expect(a.startUp).not.toBeNull();
    expect(a.startUp!.words).toBe(4);
    let short = steady(WORDS.slice(0, 11));
    for (const w of [0, 1, 2, 3]) short = withPause(short, { insideWord: [w, 0], ms: 900 });
    expect(analyseRun(short)!.startUp).toBeNull();
  });
});

describe("speeds and lost characters", () => {
  it("flowWpm = wpm·T/typing", () => {
    const a = analyseRun(withPause(steady(WORDS), { beforeWord: 6, ms: 1500 }))!;
    const r = withPause(steady(WORDS), { beforeWord: 6, ms: 1500 });
    expect(a.flowWpm).toBeCloseTo((r.wpm * a.T) / a.slices!.typing, 1);
  });

  it("lost characters match countChars differences, including the TIME last word", () => {
    const r = withMistake(withMistake(steady(WORDS), { word: 3, pos: 1, backspaces: 0 }), { word: 8, pos: 2, backspaces: 0 });
    const a = analyseRun(r)!;
    const C = (x: readonly string[]) => {
      const c = countChars(x, r.words, true);
      return c.correctWordChars + c.correctSpaces;
    };
    expect(a.mistakes.lostChars).toBe(C(r.words) - C(r.typedFinal!));
    expect(a.mistakes.left).toBe(2);
    // In a TIME run the last word reached is still in progress: never "left".
    const base = withMistake(steady(WORDS), { word: 5, pos: 1, backspaces: 0 });
    const cut = base.timings.find((e) => e.wordIndex === 5 && e.pos === 3)!.t;
    const t = analyseRun(timeRun(base, cut + 10))!;
    expect(t.mistakes.left).toBe(0);
    expect(t.mistakes.lostChars).toBe(0);
  });

  it("a TIME run that ends right after the Space committing a wrong word counts that word as left", () => {
    const words = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "again"];
    const keys = "the quick brown fox jumps over the lazy dgo ";
    const acts: Act[] = [...keys].map((c, i) => (c === " " ? { k: "space", t: i * 100 } : { k: "char", t: i * 100, ch: c }));
    const r = render({ words, acts, ctx: {}, lengthMode: "time", T: keys.length * 100 + 50, truth: noTruth() });
    const a = analyseRun(r)!;
    const C = (x: readonly string[]) => {
      const c = countChars(x, r.words, true);
      return c.correctWordChars + c.correctSpaces;
    };
    const fixed = r.typedFinal!.map((_, i) => r.words[i]!);
    expect(a.mistakes.left).toBe(1);
    expect(a.mistakes.lostChars).toBe(C(fixed) - C(r.typedFinal!));
    expect(a.mistakes.lostChars).toBe(3);
  });

  it("without buffers (a server v1 run) a word with an unfixed slip loses its length plus a Space", () => {
    const r = asV1(withMistake(steady(WORDS), { word: 3, pos: 1, backspaces: 0 }));
    const a = analyseRun({ ...r, typedFinal: undefined })!;
    expect(a.mistakes).toMatchObject({ left: 1, lostChars: 4 });
  });

  it("rcv needs 60 fluent gaps", () => {
    expect(analyseRun(steady(WORDS.slice(0, 8)))!.rcv).toBeNull();
    expect(analyseRun(steady(WORDS))!.rcv).not.toBeNull();
  });
});
