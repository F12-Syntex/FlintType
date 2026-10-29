import { describe, expect, it } from "vitest";
import { replayEpisodes } from "./episodes";
import { prepareRun } from "./prepare";
import { replayRun } from "./replay";
import { asV1, randomScript, steady, withMistake } from "./run-script";
import { buildTimeline } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field".split(" ");

describe("prepareRun", () => {
  it("a v2 run: one replay gives the buffers, the end cursor and the episodes", () => {
    const r = withMistake(steady(WORDS), { word: 3, pos: 1, backspaces: 0 });
    const p = prepareRun(r);
    expect(p.tl.capture).toBe(2);
    expect(p.replayOk).toBe(true);
    expect(p.buffers).toEqual(r.typedFinal);
    expect(p.cursor).toBe(WORDS.length - 1);
    expect(p.episodes).toHaveLength(1);
    expect(p.th).not.toBeNull();
    expect(p.budget!.slices).toBeDefined();
  });

  it("a failed replay falls back to v1 with the client's buffers", () => {
    const r = steady(WORDS);
    const bad = { ...r, timings: r.timings.map((e, i) => (i % 5 === 3 ? { ...e, pos: 9 } : e)) };
    const p = prepareRun(bad);
    expect(p.replayOk).toBe(false);
    expect(p.tl.capture).toBe(1);
    expect(p.cursor).toBeNull();
    expect(p.buffers).toEqual(r.typedFinal);
  });

  it("a v1 run has no cursor; without a pace there are no thresholds or budget", () => {
    const v1 = prepareRun(asV1(steady(WORDS)));
    expect(v1.tl.capture).toBe(1);
    expect(v1.cursor).toBeNull();
    const short = prepareRun(steady(["ab"]));
    expect(short.base.P).toBeNull();
    expect(short.th).toBeNull();
    expect(short.budget).toBeNull();
  });

  it("the single replay agrees with replayRun on 300 random runs", () => {
    for (let s = 0; s < 300; s++) {
      const r = randomScript(s);
      const tl = buildTimeline(r);
      if (tl.capture !== 2) continue;
      const one = replayEpisodes(tl, r.words);
      const ref = replayRun(tl, r.words);
      expect(one.typed).toEqual(ref.typed);
      expect(one.mismatches).toBe(ref.mismatches);
      expect(one.ok).toBe(ref.ok);
    }
  });
});
