import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { bigramCategory } from "@/lib/keystrokes/motor-features";
import { gapClass, gapClasses, gapKind } from "./gaps";
import { randomScript, steady } from "./run-script";
import { noTruth, render, type Act } from "./run-script-core";
import { buildTimeline, type Timeline } from "./timeline";

const cat = (a: string, b: string) => bigramCategory(a, b, DEFAULT_HAND_LAYOUT);

describe("gap kinds", () => {
  it("in-word, boundary (one Space), other (an edit, or a skipped word) and chunks", () => {
    const keys = "ab cd<d ef";
    const acts: Act[] = [...keys].map((c, i) => (c === " " ? { k: "space", t: i * 100 } : c === "<" ? { k: "back", t: i * 100 } : { k: "char", t: i * 100, ch: c }));
    const tl = buildTimeline(render({ words: ["ab", "cd", "ef"], acts, ctx: {}, lengthMode: "time", T: keys.length * 100, truth: noTruth() }));
    expect(Array.from({ length: tl.K - 1 }, (_, i) => gapKind(tl, i + 1))).toEqual(["inWord", "boundary", "inWord", "other", "boundary", "inWord"]);
    const chunked = buildTimeline(steady(["abcd"], { key: 1, jitter: 0 }));
    expect(gapKind(chunked, 1)).toBe("chunk");
  });
});

describe("gap classes", () => {
  it("no codeMatch gives plain classes; codeMatch gives QWERTY ones", () => {
    const words = ["edge", "Juke", "look"];
    const plain = buildTimeline(steady(words));
    expect([1, 2, 3].map((k) => gapClass(plain, k))).toEqual(["plain", "plain", "plain"]);
    const q = buildTimeline({ ...steady(words), ctx: { codeMatch: 1 } });
    // e→d same finger, d→g same hand; J is shifted; o→o repeats.
    expect(gapClass(q, 1)).toBe("finger");
    expect(gapClass(q, 2)).toBe("hand");
    const capital = q.ev.findIndex((e) => e.expected === "J");
    expect(gapClass(q, capital)).toBe("shift");
    const oo = q.ev.findIndex((e, i) => i > 0 && e.expected === "o" && q.ev[i - 1]!.expected === "o");
    expect(gapClass(q, oo)).toBe("repeat");
  });

  it("QWERTY classes match bigramCategory under the default hand layout for every unshifted pair", () => {
    const keys = "abcdefghijklmnopqrstuvwxyz0123456789-=[];',./`\\é";
    const want = { "same-finger": "finger", "same-hand": "hand", "cross-hand": "cross", unknown: "other" } as const;
    for (const a of keys) for (const b of keys) {
      const tl = { ev: [{ expected: a }, { expected: b }], qwerty: true } as unknown as Timeline;
      expect(gapClass(tl, 1), a + b).toBe(a === b ? "repeat" : want[cat(a, b)]);
    }
  });

  it("gapClasses is gapClass at every gap", () => {
    for (let s = 0; s < 50; s++) {
      const r = randomScript(s);
      for (const tl of [buildTimeline(r), buildTimeline({ ...r, ctx: { ...r.ctx, codeMatch: 1 } })]) {
        const all = gapClasses(tl);
        expect(all[0]).toBe("plain");
        for (let k = 1; k < tl.K; k++) expect(all[k]).toBe(gapClass(tl, k));
      }
    }
  });
});
