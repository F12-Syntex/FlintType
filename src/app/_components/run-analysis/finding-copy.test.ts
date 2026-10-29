import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { Finding } from "@/types/typing-analysis";
import { type CopyUnit, type FindingCopy, findingCopy, flowLine, methodParagraphs, pbCopy, toPlain } from "./finding-copy";

const WPM: CopyUnit = { unit: "wpm", decimals: false };
const lead = (c: FindingCopy) => toPlain(c.lead);
const follow = (c: FindingCopy) => (c.follow ? toPlain(c.follow) : null);
const plainAll: string[] = [];
/** Every sentence a test produces is also checked against I11 at the end. */
function seen(c: FindingCopy): FindingCopy {
  plainAll.push(lead(c));
  if (c.follow) plainAll.push(toPlain(c.follow));
  return c;
}
const f = (x: Finding, o: CopyUnit = WPM) => seen(findingCopy(x, o));

describe("findingCopy: fixing", () => {
  const base = { kind: "fixing", impactMs: 1200, ms: 1234, worstWord: null, noticedLate: null } as const;
  it("one mistake, with and without the late-notice follow-up", () => {
    expect(lead(f({ ...base, count: 1 }))).toBe("You spent 1.2 seconds fixing a mistake.");
    expect(follow(f({ ...base, count: 1, noticedLate: 1 }))).toBe("It took a letter or more to notice.");
    expect(f({ ...base, count: 1, noticedLate: 0 }).follow).toBeNull();
    expect(f({ ...base, count: 1 }).icon).toBe("eraser");
  });
  it("several mistakes take the first follow-up that applies", () => {
    expect(lead(f({ ...base, count: 3 }))).toBe("You spent 1.2 seconds fixing 3 mistakes.");
    expect(toPlain(f({ ...base, count: 3, worstWord: "brown", noticedLate: 2 }).follow!)).toBe("Much of it was in “brown”.");
    expect(follow(f({ ...base, count: 3, noticedLate: 2 }))).toBe("2 of them took a letter or more to notice.");
    expect(follow(f({ ...base, count: 3, noticedLate: 1 }))).toBe("1 of them took a letter or more to notice.");
    expect(follow(f({ ...base, count: 3, noticedLate: 0 }))).toBe("You caught all of them straight away.");
    expect(f({ ...base, count: 3 }).follow).toBeNull();
  });
  it("the word part is a separate part, never glued into the string", () => {
    const c = f({ ...base, count: 2, worstWord: "jumps" });
    expect(c.follow).toEqual(["Much of it was in ", { word: "jumps" }, "."]);
  });
});

describe("findingCopy: left", () => {
  const base = { kind: "left", impactMs: 1600, lostWpm: 3 } as const;
  it("singular and plural, with backspace on and off", () => {
    expect(lead(f({ ...base, count: 1, canFix: true }))).toBe("1 word still had a mistake when you moved on.");
    expect(follow(f({ ...base, count: 1, canFix: true }))).toBe("It didn't count, which took about 3 wpm off your speed.");
    expect(follow(f({ ...base, count: 1, canFix: false }))).toBe(
      "With backspace off, a word with a mistake doesn't count, so it took about 3 wpm off your speed.",
    );
    expect(lead(f({ ...base, count: 2, canFix: true }))).toBe("2 words still had a mistake when you moved on.");
    expect(follow(f({ ...base, count: 2, canFix: true }))).toBe("They didn't count, which took about 3 wpm off your speed.");
    expect(follow(f({ ...base, count: 2, canFix: false }))).toBe(
      "With backspace off, a word with a mistake doesn't count, so they took about 3 wpm off your speed.",
    );
  });
  it("speaks the user's unit", () => {
    expect(follow(f({ ...base, count: 1, canFix: true }, { unit: "cpm", decimals: false }))).toBe(
      "It didn't count, which took about 15 cpm off your speed.",
    );
  });
});

describe("findingCopy: before", () => {
  const base = { kind: "before", impactMs: 2100, ms: 2100, longWords: false } as const;
  it("one pause names its word, or falls back without one", () => {
    const c = f({ ...base, count: 1, longest: { ms: 2120, word: "the" } });
    expect(c.lead).toEqual(["You paused for 2.1 seconds before ", { word: "the" }, "."]);
    expect(c.follow).toBeNull();
    expect(lead(f({ ...base, count: 1, longest: null }))).toBe("You paused once before a word, for 2.1 seconds.");
  });
  it("several pauses: long words first, then the longest", () => {
    const longest = { ms: 1400, word: "across" };
    expect(lead(f({ ...base, count: 3, longest }))).toBe("You paused before 3 words, 2.1 seconds in all.");
    expect(follow(f({ ...base, count: 3, longest, longWords: true }))).toBe("Longer words made you pause more often.");
    expect(follow(f({ ...base, count: 3, longest }))).toBe("The longest was 1.4 seconds before “across”.");
    expect(f({ ...base, count: 3, longest: null }).follow).toBeNull();
  });
});

describe("findingCopy: the other kinds", () => {
  it("inside, with and without a top word", () => {
    const c = f({ kind: "inside", impactMs: 900, ms: 900, count: 4, topWord: "quick" });
    expect(lead(c)).toBe("Small hesitations inside words added up to 0.9 seconds.");
    expect(c.follow).toEqual([{ word: "quick" }, " slowed you most."]);
    expect(f({ kind: "inside", impactMs: 900, ms: 900, count: 4, topWord: null }).follow).toBeNull();
  });
  it("breaks, once and several times", () => {
    expect(lead(f({ kind: "breaks", impactMs: 3000, ms: 3000, count: 1 }))).toBe("You stopped typing for 3 seconds.");
    const c = f({ kind: "breaks", impactMs: 7000, ms: 12_400, count: 2 });
    expect(lead(c)).toBe("You stopped typing 2 times, 12 seconds in all.");
    expect(follow(c)).toBe("That time still counts in your result.");
  });
  it("fade and start-up", () => {
    const fade = f({ kind: "fade", impactMs: 900, fromWpm: 82, toWpm: 71, lastSeconds: 10 });
    expect(lead(fade)).toBe("You slowed down towards the end, from about 82 wpm to 71 wpm.");
    expect(follow(fade)).toBe("That was over the last 10 seconds.");
    const up = f({ kind: "startUp", impactMs: 1500, words: 4, ms: 1500 });
    expect(lead(up)).toBe("You took a few words to get going.");
    expect(follow(up)).toBe("The first 4 words cost about 1.5 seconds.");
  });
  it("even, short and clock", () => {
    expect(lead(f({ kind: "even", impactMs: 0, mistakes: 0 }))).toBe("A clean, even run.");
    expect(follow(f({ kind: "even", impactMs: 0, mistakes: 0 }))).toBe("Nothing held you up for long.");
    expect(lead(f({ kind: "even", impactMs: 0, mistakes: 2 }))).toBe("An even run.");
    expect(follow(f({ kind: "even", impactMs: 0, mistakes: 2 }))).toBe("Nothing slowed you down much.");
    expect(lead(f({ kind: "short", impactMs: 0 }))).toBe("This test was too short to break down.");
    expect(lead(f({ kind: "clock", impactMs: 0 }))).toBe("This test's timing looks off, so we can't break it down.");
  });
});

describe("pbCopy", () => {
  const o = { ...WPM, noun: "Casual test of 25 words", wpm: 84.4 };
  it("names the gain once it is at least 1 in the user's unit", () => {
    expect(lead(seen(pbCopy({ ...o, previousBest: 80 })))).toBe("Your best Casual test of 25 words so far, 4 wpm above your previous best.");
    expect(lead(seen(pbCopy({ ...o, previousBest: 83.4 })))).toBe("Your best Casual test of 25 words so far, 1 wpm above your previous best.");
  });
  it("d = 0 and an unknown previous best read as a plain best", () => {
    expect(lead(seen(pbCopy({ ...o, previousBest: 84 })))).toBe("Your best Casual test of 25 words so far.");
    expect(lead(seen(pbCopy({ ...o, previousBest: undefined })))).toBe("Your best Casual test of 25 words so far.");
  });
  it("a first test of its kind", () => {
    const c = seen(pbCopy({ ...o, previousBest: null }));
    expect(lead(c)).toBe("Your first Casual test of 25 words. Now there's a best to beat.");
    expect(c.icon).toBe("crown");
  });
});

describe("flowLine and methodParagraphs", () => {
  it("flowLine in wpm and cpm", () => {
    plainAll.push(flowLine(91.6, "wpm", false), flowLine(91.6, "cpm", false));
    expect(flowLine(91.6, "wpm", false)).toBe("When nothing held you up, you typed at about 92 wpm.");
    expect(flowLine(91.6, "cpm", false)).toBe("When nothing held you up, you typed at about 458 cpm.");
  });
  it("keys a second is the flow speed in keys, and the catch factor drops a .0", () => {
    const [pace, catches] = methodParagraphs({ flowWpm: 96, catchFactor: 2, breakMs: 2000, fixMode: "fix" });
    expect(pace).toContain("This time that was about 8 keys a second.");
    expect(catches).toContain("(this time, about 2 times as long)");
    const [pace2, catches2] = methodParagraphs({ flowWpm: 100, catchFactor: 1.83, breakMs: 2000, fixMode: "fix" });
    expect(pace2).toContain(`about ${Math.round((100 * 5) / 6) / 10} keys a second`);
    expect(catches2).toContain("about 1.8 times as long");
  });
  it("without a flow speed or pace, the figures are left out", () => {
    const [pace, catches] = methodParagraphs({ flowWpm: null, catchFactor: null, breakMs: 2000, fixMode: "fix" });
    expect(pace).toBe("We look at the gap before every key you press and compare it with your own pace in this test.");
    expect(catches.startsWith("A key inside a word that takes noticeably longer than your pace counts as a hesitation.")).toBe(true);
  });
  it("the break threshold and the fix mode", () => {
    const at2 = methodParagraphs({ flowWpm: 60, catchFactor: 1.8, breakMs: 2000, fixMode: "fix" });
    expect(at2[3]).toBe(
      "Breaks are stops of 2 seconds or more, plus the wait before your first key in a race. Typing is everything else, and the five parts always add up to the whole test.",
    );
    expect(methodParagraphs({ flowWpm: 60, catchFactor: 1.8, breakMs: 4000, fixMode: "block" })[3]).toContain("stops of 4 seconds or more");
    expect(at2[2]).toContain("A mistake is one slip and its fix");
    expect(methodParagraphs({ flowWpm: 60, catchFactor: 1.8, breakMs: 2000, fixMode: "block" })[2]).toBe(at2[2]);
    const none = methodParagraphs({ flowWpm: 60, catchFactor: 1.8, breakMs: 2000, fixMode: "none" });
    expect(none[2]).toBe("With backspace off, Fixing mistakes is the extra time after a mistake until you move on. Errors, above, counts every wrong key.");
    for (const fm of ["fix", "block", "none"] as const) {
      for (const b of [2000, 4000]) plainAll.push(...methodParagraphs({ flowWpm: 60, catchFactor: 1.8, breakMs: b, fixMode: fm }));
    }
    plainAll.push(...methodParagraphs({ flowWpm: null, catchFactor: null, breakMs: 2000, fixMode: "fix" }));
  });
});

describe("toPlain", () => {
  it("quotes word parts with curly quotes", () => {
    expect(toPlain(["Much of it was in ", { word: "fox" }, "."])).toBe("Much of it was in “fox”.");
    expect(toPlain([{ word: "fox" }, " slowed you most."])).toBe("“fox” slowed you most.");
  });
});

describe("I11: every generated sentence", () => {
  it("passes the copy rules and never shows ms, % or a multiplication sign", () => {
    expect(plainAll.length).toBeGreaterThan(40);
    for (const s of plainAll) {
      expect(bannedPatterns(s), s).toEqual([]);
      expect(s, s).not.toMatch(/\bms\b|%|×/);
    }
  });
});
