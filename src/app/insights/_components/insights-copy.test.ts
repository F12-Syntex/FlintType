import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import { testKindOf } from "./copy-phrases";
import * as copy from "./insights-copy";

const kind = testKindOf({
  key: "training|words|25", mode: "training", lengthMode: "words", length: 25, touch: false,
  tests: 40, analysed: 40, lastAtMs: 0,
});
const clean = (s: string) => expect(bannedPatterns(s), s).toEqual([]);

describe("header description", () => {
  it("names the window by state", () => {
    expect(copy.headerDescription({ status: "empty", tests: 0, kind })).toBe(
      "Your analysis builds from every test you finish.",
    );
    expect(copy.headerDescription({ status: "ready", tests: 1, kind })).toBe(
      "Based on the one Adapt test of 25 words you've finished so far.",
    );
    expect(copy.headerDescription({ status: "ready", tests: 3, kind })).toBe(
      "Based on the 3 Adapt tests of 25 words you've finished so far.",
    );
    expect(copy.headerDescription({ status: "ready", tests: 12, kind })).toBe("Based on your last 12 Adapt tests of 25 words.");
    expect(copy.headerDescription({ status: "not-ready", tests: 200, kind })).toBe(
      "Based on your last 30 Adapt tests of 25 words.",
    );
  });
});

describe("switch error", () => {
  it("names the kind that failed", () => {
    expect(copy.switchErrorTitle(kind)).toBe("We couldn't load your Adapt tests of 25 words.");
  });
});

describe("time section", () => {
  it("writes each line", () => {
    expect(copy.timeDescription(30, kind)).toBe("A typical minute from your last 30 Adapt tests of 25 words.");
    expect(copy.timeLearningLine({ have: 4, need: 5, unit: "tests" }, kind)).toBe(
      "After 1 more Adapt test of 25 words you'll see a typical minute, and how it compares with your better days.",
    );
    expect(copy.flowLine(92.4, "wpm")).toBe("When nothing holds you up, you type at about 92 wpm.");
    expect(copy.whatIfLine({ low: 77, high: 81 }, "wpm")).toBe(
      "If your pauses and fixes matched your better days, you'd type about 77 to 81 wpm.",
    );
    expect(copy.whatIfLine({ low: 79, high: 79 }, "wpm")).toBe(
      "If your pauses and fixes matched your better days, you'd type about 79 wpm.",
    );
  });
  it("leaves out the keys-a-second sentence without a flow speed", () => {
    const withFlow = copy.timeMethod({ keysPerSecond: 6.3, catchFactor: 1.8, tests: 30, kind });
    expect(withFlow[0]).toMatch(/Lately that's about 6.3 keys a second\.$/);
    expect(withFlow[1]).toMatch(/lately about 1.8 times as long/);
    expect(withFlow[2]).toMatch(/from your last 30 Adapt tests of 25 words, and each minute always adds up to 60 seconds\.$/);
    const without = copy.timeMethod({ keysPerSecond: null, catchFactor: 2, tests: 30, kind });
    expect(without[0]).not.toMatch(/keys a second/);
    expect(without[1]).toMatch(/lately about 2 times as long/);
  });
});

describe("learning steps", () => {
  it("counts each step up, and marks what is done", () => {
    const steps = copy.learningSteps({ tests: 3, analysed: 3, sessions: 1, sessionsWithTwo: 1, spanDays: 0 }, kind);
    expect(steps.map((s) => s.done)).toEqual([true, false, false, false, false, false]);
    expect(steps[1]!.detail).toBe("After 5 Adapt tests of 25 words. 2 to go.");
    expect(steps[2]!.detail).toBe("After 10 Adapt tests of 25 words. 7 to go.");
    const later = copy.learningSteps({ tests: 40, analysed: 40, sessions: 9, sessionsWithTwo: 8, spanDays: 20 }, kind);
    expect(later.every((s) => s.done)).toBe(true);
    expect(later[1]!.detail).toBe("After 5 Adapt tests of 25 words.");
  });
  it("uses a generic name before the first test", () => {
    const steps = copy.learningSteps({ tests: 0, analysed: 0, sessions: 0, sessionsWithTwo: 0, spanDays: 0 }, testKindOf(null));
    expect(steps[1]!.detail).toBe("After 5 tests of the same kind. 5 to go.");
  });
});

describe("copy rules", () => {
  it("holds for every generated and fixed string", () => {
    const kinds = [kind, testKindOf(null)];
    const strings: string[] = [
      copy.EMPTY_BODY, copy.NOT_READY_LINE, copy.COARSE_NOTE, copy.HELP_DESCRIPTION, copy.PRACTICE_DESCRIPTION,
      copy.HABITS_DESCRIPTION, copy.PLAYGROUND_DESCRIPTION, copy.ADAPT_NOTE, copy.SIGN_IN_LINE, copy.RATE_LIMITED_LINE,
      copy.OFFLINE_LINE, copy.TIME_LEARNING_DESCRIPTION, copy.switchErrorTitle(kind), copy.switchErrorTitle(testKindOf(null)), copy.errorCodeLine("INTERNAL"), copy.changesDescription(30),
      ...copy.PRACTICE_METHOD, ...copy.CHANGES_METHOD, ...copy.ADAPT_METHOD, copy.flowLine(150, "cps"),
    ];
    for (const k of kinds) {
      for (const n of [0, 1, 2, 4, 5, 30, 200]) {
        strings.push(copy.headerDescription({ status: "ready", tests: n, kind: k }));
        strings.push(copy.timeLearningLine({ have: n % 5, need: 5, unit: "tests" }, k));
      }
      strings.push(...copy.timeMethod({ keysPerSecond: 12.5, catchFactor: 3, tests: 30, kind: k }));
      for (const step of copy.learningSteps({ tests: 2, analysed: 1, sessions: 1, sessionsWithTwo: 0, spanDays: 0 }, k)) {
        strings.push(step.detail);
        expect(bannedPatterns(step.title, { heading: true })).toEqual([]);
      }
    }
    for (const s of strings) clean(s);
    for (const t of [copy.PAGE_TITLE, copy.TIME_TITLE, copy.HELP_TITLE, copy.CHANGES_TITLE, copy.PRACTICE_TITLE,
      copy.TREND_TITLE, copy.HABITS_TITLE, copy.PLAYGROUND_TITLE, copy.LEARNING_TITLE, copy.EMPTY_TITLE, copy.ERROR_TITLE,
      copy.RECENT_BAR_LABEL, copy.BETTER_BAR_LABEL, copy.LAST_BAR_LABEL, copy.TAKE_A_TEST]) {
      expect(bannedPatterns(t, { heading: true }), t).toEqual([]);
    }
  });
});
