import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { Change, ChangeKind } from "@/types/insights";
import { betterIsLower, CHANGES_EMPTY, changeDetail, changesLearning, changeTitle } from "./change-copy";
import { testKindOf } from "./copy-phrases";

const kind = testKindOf({
  key: "race|words|25", mode: "race", lengthMode: "words", length: 25, touch: false,
  tests: 40, analysed: 40, lastAtMs: 0,
});
const ch = (k: ChangeKind, direction: Change["direction"], before: number, after: number, key?: string): Change => ({
  kind: k, direction, before, after, key,
  unit: k === "speed" || k === "flow" ? "wpm" : k === "accuracy" ? "points" : k === "pair" ? "ms" : "sPerMin",
});

describe("change rows", () => {
  it("titles and details each kind, both ways", () => {
    expect(changeTitle(ch("speed", "better", 70, 74))).toBe("You got faster.");
    expect(changeDetail(ch("speed", "better", 70, 74), "wpm", 30)).toBe("About 4 wpm more than the 30 tests before.");
    expect(changeTitle(ch("speed", "worse", 74, 70))).toBe("A little slower.");
    expect(changeDetail(ch("speed", "worse", 74, 70), "wpm", 30)).toBe("About 4 wpm below the 30 tests before.");
    expect(changeDetail(ch("accuracy", "better", 95.6, 97.2), "wpm", 30)).toBe("97% now, up from 96%.");
    expect(changeDetail(ch("accuracy", "worse", 97.2, 95.4), "wpm", 30)).toBe("95% now, down from 97%.");
    expect(changeTitle(ch("fixing", "better", 3.4, 2.1))).toBe("Less time fixing mistakes.");
    expect(changeDetail(ch("fixing", "better", 3.4, 2.1), "wpm", 30)).toBe("About 2.1 seconds a minute, down from 3.4 seconds.");
    expect(changeDetail(ch("before", "worse", 1, 2.5), "wpm", 30)).toBe("About 2.5 seconds a minute, up from 1 second.");
    expect(changeDetail(ch("inside", "better", 1.2, 0.3), "wpm", 30)).toBe("Under half a second a minute, down from 1.2 seconds.");
    expect(changeDetail(ch("inside", "worse", 0.2, 1.4), "wpm", 30)).toBe("About 1.4 seconds a minute, up from under half a second.");
    // Never "About under half a second", even for junk.
    expect(changeDetail(ch("inside", "better", 1.2, Number.NaN), "wpm", 30)).toMatch(/^Under half a second a minute, /);
    expect(changeTitle(ch("flow", "worse", 92, 88))).toBe("Your flowing speed dipped.");
    expect(changeDetail(ch("flow", "worse", 92, 88), "wpm", 30)).toBe("About 88 wpm when nothing holds you up, down from 92.");
    expect(changeTitle(ch("pair", "better", 180, 150, "th"))).toBe("“th” got quicker.");
    expect(changeDetail(ch("pair", "better", 180, 150, "th"), "wpm", 30)).toBe(
      "From about 0.18 s to 0.15 s each time, allowing for your overall speed.",
    );
    expect(changeTitle(ch("pair", "worse", 150, 180, "er"))).toBe("“er” got slower.");
  });
  it("knows which way is better", () => {
    expect(betterIsLower("fixing")).toBe(true);
    expect(betterIsLower("pair")).toBe(true);
    expect(betterIsLower("speed")).toBe(false);
    expect(betterIsLower("accuracy")).toBe(false);
  });
  it("counts up while learning, in tests or sessions", () => {
    expect(changesLearning({ have: 12, need: 15, unit: "tests" }, kind)).toBe(
      "After 3 more races of 25 words we can tell you what's changing.",
    );
    expect(changesLearning({ have: 14, need: 15, unit: "tests" }, kind)).toBe(
      "After 1 more race of 25 words we can tell you what's changing.",
    );
    expect(changesLearning({ have: 1, need: 2, unit: "sessions" }, kind)).toBe(
      "Once your last 10 tests span 2 sessions, we can tell you what's changing.",
    );
  });
  it("passes the copy rules in every branch", () => {
    const kinds: ChangeKind[] = ["speed", "accuracy", "fixing", "before", "inside", "flow", "pair"];
    const strings = [CHANGES_EMPTY];
    for (const k of kinds) {
      for (const [d, b, a] of [["better", 5, 3], ["worse", 3, 5], ["better", 0.3, 0.1], ["worse", 0.1, 0.9]] as const) {
        const c = ch(k, d, b * (k === "pair" ? 50 : 1), a * (k === "pair" ? 50 : 1), "ou");
        expect(bannedPatterns(changeTitle(c))).toEqual([]);
        strings.push(changeDetail(c, "wpm", 30), changeDetail(c, "cps", 25));
      }
    }
    for (const s of strings) expect(bannedPatterns(s), s).toEqual([]);
  });
});
