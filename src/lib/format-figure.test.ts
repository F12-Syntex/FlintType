import { describe, expect, it } from "vitest";
import { SLICE_ORDER } from "@/types/typing-analysis";
import { bannedPatterns } from "./copy-rules";
import {
  SLICE_LABEL,
  ago,
  asLongAs,
  breakClause,
  breakSeconds,
  dateShort,
  dateTime,
  fixingClause,
  keysWorth,
  list,
  oneIn,
  perKey,
  perMinute,
  plural,
  secShort,
  seconds,
  sliceClause,
  speed,
  speedRange,
} from "./format-figure";

describe("seconds and secShort", () => {
  it("uses one decimal under 10 seconds", () => {
    expect(seconds(400)).toBe("0.4 seconds");
    expect(seconds(9600)).toBe("9.6 seconds");
    expect(secShort(400)).toBe("0.4 s");
    expect(secShort(500)).toBe("0.5 s");
  });

  it("says 1 second when it rounds to 1.0", () => {
    expect(seconds(1000)).toBe("1 second");
    expect(seconds(1040)).toBe("1 second");
    expect(seconds(1050)).toBe("1.1 seconds");
  });

  it("drops a trailing .0", () => {
    expect(seconds(9000)).toBe("9 seconds");
    expect(secShort(9000)).toBe("9 s");
  });

  it("uses whole seconds from 10 seconds, including the rounding edge", () => {
    expect(seconds(9960)).toBe("10 seconds");
    expect(seconds(12_400)).toBe("12 seconds");
    expect(secShort(44_000)).toBe("44 s");
    expect(secShort(1_234_000)).toBe("1,234 s");
  });

  it("reads zero, negatives and junk as 0", () => {
    expect(secShort(0)).toBe("0 s");
    expect(seconds(0)).toBe("0 seconds");
    expect(seconds(-300)).toBe("0 seconds");
    expect(secShort(Number.NaN)).toBe("0 s");
  });
});

describe("perMinute", () => {
  it("states seconds a minute", () => {
    expect(perMinute(4.5)).toBe("4.5 seconds a minute");
    expect(perMinute(12)).toBe("12 seconds a minute");
    expect(perMinute(1)).toBe("1 second a minute");
    expect(perMinute(0.5)).toBe("0.5 seconds a minute");
  });

  it("says under half a second below 0.5", () => {
    expect(perMinute(0.49)).toBe("under half a second a minute");
    expect(perMinute(0)).toBe("under half a second a minute");
  });
});

describe("perKey", () => {
  it("uses two decimals under a second and one from a second", () => {
    expect(perKey(140)).toBe("0.14 s");
    expect(perKey(5)).toBe("0.01 s");
    expect(perKey(994)).toBe("0.99 s");
    expect(perKey(995)).toBe("1.0 s");
    expect(perKey(1400)).toBe("1.4 s");
  });
});

describe("oneIn", () => {
  it.each([
    [0.2, "1 in 5"],
    [0.1, "1 in 10"],
    [0.09, "1 in 12"],
    [0.33, "1 in 3"],
    [0.4, "1 in 3"],
    [0.42, "1 in 2"],
    [0.011, "1 in 100"],
    [0.026, "1 in 40"],
  ])("rate %d reads %s", (rate, text) => {
    expect(oneIn(rate)).toBe(text);
  });

  it("has floors at both ends", () => {
    expect(oneIn(0.0099)).toBe("fewer than 1 in 100");
    expect(oneIn(0)).toBe("fewer than 1 in 100");
    expect(oneIn(0.45)).toBe("about half");
    expect(oneIn(0.59)).toBe("about half");
  });

  it("never understates a high rate as half", () => {
    expect(oneIn(0.65)).toBe("2 in 3");
    expect(oneIn(0.75)).toBe("3 in 4");
    expect(oneIn(0.8)).toBe("4 in 5");
    expect(oneIn(0.9)).toBe("9 in 10");
    expect(oneIn(1)).toBe("almost all");
  });
});

describe("asLongAs", () => {
  it.each([
    [1, "about as long as"],
    [1.19, "about as long as"],
    [1.2, "a bit longer than"],
    [1.4, "about one and a half times as long as"],
    [1.8, "about twice as long as"],
    [2.29, "about twice as long as"],
    [2.3, "more than twice as long as"],
  ])("ratio %d reads %s", (r, text) => {
    expect(asLongAs(r)).toBe(text);
  });
});

describe("keysWorth", () => {
  it("rounds to whole letters, at least one", () => {
    expect(keysWorth(4.4)).toBe("typing 4 letters");
    expect(keysWorth(1)).toBe("typing 1 letter");
    expect(keysWorth(0.2)).toBe("typing 1 letter");
  });
});

describe("speed and speedRange", () => {
  it("formats in the user's unit", () => {
    expect(speed(72.4, "wpm")).toBe("72 wpm");
    expect(speed(72, "cpm")).toBe("360 cpm");
    expect(speed(72.44, "wpm", true)).toBe("72.4 wpm");
  });

  it("states a range, or one number when both ends round alike", () => {
    expect(speedRange(77.2, 80.6, "wpm")).toBe("about 77 to 81 wpm");
    expect(speedRange(78.6, 79.4, "wpm")).toBe("about 79 wpm");
    expect(speedRange(81, 77, "wpm")).toBe("about 77 to 81 wpm");
  });
});

describe("ago", () => {
  const now = new Date(2026, 9, 29, 12, 0).getTime();
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();

  it("counts calendar days", () => {
    expect(ago(at(2026, 9, 29, 8), now)).toBe("earlier today");
    expect(ago(at(2026, 9, 28, 23), now)).toBe("yesterday");
    expect(ago(at(2026, 9, 26), now)).toBe("3 days ago");
  });

  it("moves to weeks, then a month, then a month name", () => {
    expect(ago(at(2026, 9, 22), now)).toBe("1 week ago");
    expect(ago(at(2026, 9, 15), now)).toBe("2 weeks ago");
    expect(ago(at(2026, 8, 25), now)).toBe("about a month ago");
    expect(ago(at(2026, 7, 10), now)).toBe("in August");
    expect(ago(at(2025, 10, 10), now)).toBe("in November 2025");
  });

  it("reads a future time as today", () => {
    expect(ago(now + 3_600_000, now)).toBe("earlier today");
  });
});

describe("dates", () => {
  const t = new Date(2026, 9, 27, 14, 5).getTime();
  it("formats a short date and a date with time", () => {
    expect(dateShort(t, "en-GB")).toBe("27 Oct");
    expect(dateTime(t, "en-GB")).toBe("Tue 27 Oct, 14:05");
  });
});

describe("list and plural", () => {
  it("joins with commas and a final and", () => {
    expect(list([])).toBe("");
    expect(list(["w"])).toBe("w");
    expect(list(["w", "s"])).toBe("w and s");
    expect(list(["w", "s", "x"])).toBe("w, s and x");
  });

  it("pluralises with the count", () => {
    expect(plural(1, "mistake", "mistakes")).toBe("1 mistake");
    expect(plural(0, "mistake", "mistakes")).toBe("0 mistakes");
    expect(plural(1240, "test", "tests")).toBe("1,240 tests");
  });

  it("picks the form from the printed count, not the raw number", () => {
    expect(plural(1.04, "test", "tests")).toBe("1 test");
    expect(plural(0.96, "point", "points")).toBe("1 point");
    expect(plural(1.0000001, "test", "tests")).toBe("1 test");
    expect(plural(1.06, "point", "points")).toBe("1.1 points");
    expect(plural(Number.NaN, "test", "tests")).toBe("0 tests");
  });
});

describe("clauses", () => {
  it("uses the 2 second floor up to 2000 ms", () => {
    expect(breakClause(2000)).toBe(
      "Stops of 2 seconds or more, and the wait before your first key in a race.",
    );
    expect(breakClause(1200)).toBe(breakClause(2000));
  });

  it("names a longer break threshold to one decimal", () => {
    expect(breakClause(3400)).toBe(
      "Stops of 3.4 seconds or more, and the wait before your first key in a race.",
    );
    expect(breakSeconds(2500)).toBe("2.5 seconds");
    expect(breakSeconds(2600)).toBe("2.6 seconds");
    expect(breakSeconds(9600)).toBe("9.6 seconds");
    expect(breakSeconds(12500)).toBe("12.5 seconds");
    expect(breakSeconds(12000)).toBe("12 seconds");
    expect(breakSeconds(3000)).toBe("3 seconds");
  });

  it("keeps the exact floor text and never misstates the threshold by more than 0.05 s", () => {
    expect(breakSeconds(2000)).toBe("2 seconds");
    expect(breakSeconds(2004)).toBe("2 seconds");
    expect(breakSeconds(Number.NaN)).toBe("2 seconds");
    expect(breakSeconds(Number.POSITIVE_INFINITY)).toBe("2 seconds");
    for (let ms = 2001; ms <= 30000; ms += 7) {
      const shown = Number.parseFloat(breakSeconds(ms).replace(",", ""));
      expect(Math.abs(shown * 1000 - ms)).toBeLessThanOrEqual(50 + 1e-6);
    }
  });

  it("describes fixing by fix mode", () => {
    expect(fixingClause("fix")).toBe("The extra time from a mistake until you're back on track.");
    expect(fixingClause("block")).toBe(fixingClause("fix"));
    expect(fixingClause("none")).toBe(
      "With backspace off, the extra time after a mistake until you move on.",
    );
  });

  it("labels and describes every slice with clean copy", () => {
    for (const key of SLICE_ORDER) {
      expect(bannedPatterns(SLICE_LABEL[key], { heading: true })).toEqual([]);
      for (const fixMode of ["fix", "block", "none"] as const) {
        for (const breakMs of [2000, 4000]) {
          expect(bannedPatterns(sliceClause(key, { breakMs, fixMode }))).toEqual([]);
        }
      }
    }
  });
});
