import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import { dateShort, dateTime } from "@/lib/format-figure";
import * as copy from "./trend-copy";

const T = Date.UTC(2026, 9, 27, 14, 5);
const ref: [number, number] = [66, 79];
const views: copy.TrendView[] = [
  { adjusted: false, daily: false },
  { adjusted: true, daily: false },
  { adjusted: false, daily: true },
  { adjusted: true, daily: true },
];
const point = (o: Partial<copy.TrendPointCopy> = {}): copy.TrendPointCopy => ({
  t: T, valueWpm: 78, typedWpm: 85.4, acc: 96.4, pb: false, day: false, ref, ...o,
});

describe("per-test chart", () => {
  const v = views[0]!;
  it("labels dots as tests", () => {
    expect(copy.legendLabels(v)).toEqual({
      median: "Typical speed", band: "Usual range", test: "One test", pb: "Personal best",
    });
    expect(copy.fieldBest(v)).toBe("Best");
    expect(copy.rangeOne(v)).toBe("Only one test in this range. Pick a longer range to see your trend.");
    expect(copy.tableCaption(v)).toBe("Your most recent tests, newest first.");
    expect(copy.tableHeaders(v).date).toBe("Date");
    expect(copy.rowWhen(point(), v)).toBe(dateTime(T));
  });
  it("gives the figure, then a best or the range position", () => {
    expect(copy.tooltipLines(point(), v, "wpm")).toEqual({
      when: dateTime(T), figure: "78 wpm, 96% accuracy", notes: ["Inside your usual range at the time"],
    });
    expect(copy.tooltipLines(point({ pb: true }), v, "wpm").notes).toEqual(["A personal best"]);
    // Before the band starts there is nothing to compare with.
    expect(copy.tooltipLines(point({ ref: null }), v, "wpm").notes).toEqual([]);
    expect(copy.rowNote(point({ pb: true }), v)).toBe("Personal best");
    expect(copy.rowNote(point(), v)).toBeNull();
  });
});

describe("adjusted (Adapt) chart", () => {
  const v = views[1]!;
  it("gives both figures and calls the best a typed speed", () => {
    expect(copy.fieldBest(v)).toBe("Best typed speed");
    expect(copy.tooltipLines(point(), v, "wpm")).toEqual({
      when: dateTime(T),
      figure: "78 wpm allowing for difficulty",
      notes: ["85 wpm typed, 96% accuracy", "Inside your usual range at the time"],
    });
    expect(copy.tooltipLines(point({ pb: true }), v, "cpm")).toEqual({
      when: dateTime(T),
      figure: "390 cpm allowing for difficulty",
      notes: ["427 cpm typed, 96% accuracy", "A personal best for typed speed"],
    });
    expect(copy.rowNote(point({ pb: true }), v)).toBe("Typed personal best");
  });
});

describe("pooled Adapt chart", () => {
  it("says what the charted speed allows for", () => {
    const base = { adjusted: true, daily: false };
    expect(copy.tooltipLines(point(), { ...base, allowing: "length" }, "wpm").figure).toBe("78 wpm allowing for length");
    expect(copy.tooltipLines(point(), { ...base, allowing: "length and difficulty" }, "wpm").figure).toBe(
      "78 wpm allowing for length and difficulty",
    );
  });
});

describe("daily chart (a long series, one point a day)", () => {
  const v = views[2]!;
  it("calls a dot a day, not a test", () => {
    expect(copy.legendLabels(v).test).toBe("Middle of a day's tests");
    expect(copy.rangeOne(v)).toBe("Only one day in this range. Pick a longer range to see your trend.");
    expect(copy.chartLabel(v)).toBe("Your speed over time, one dot a day. The table below lists the same days.");
    expect(copy.tableCaption(v)).toBe(
      "One row a day, showing the middle of that day's tests, newest first. A personal best gets a row of its own.",
    );
    expect(copy.tableHeaders(v).date).toBe("Day");
    expect(copy.rowWhen(point({ day: true }), v)).toBe(dateShort(T));
  });
  it("gives a day no invented time, and says what it is", () => {
    expect(copy.tooltipLines(point({ day: true, valueWpm: 90 }), v, "wpm")).toEqual({
      when: dateShort(T), figure: "90 wpm, 96% accuracy", notes: ["The middle of that day's tests", "Above your usual range at the time"],
    });
    // A personal best stays a single test with its own time.
    expect(copy.tooltipLines(point({ pb: true }), v, "wpm").when).toBe(dateTime(T));
  });
});

describe("range position", () => {
  it("places a speed against the usual range at the time", () => {
    expect(copy.rangePosition(80, ref)).toBe("Above your usual range at the time");
    expect(copy.rangePosition(60, ref)).toBe("Below your usual range at the time");
    expect(copy.rangePosition(72, ref)).toBe("Inside your usual range at the time");
    expect(copy.rangePosition(79, ref)).toBe("Inside your usual range at the time");
    expect(copy.rangePosition(72, null)).toBeNull();
  });
  it("judges each point by its own band, not today's range", () => {
    // Rising from 50 to 62 wpm: an early 55 wpm test sat inside the band
    // of its day, though it is below today's 56 to 65.
    expect(copy.tooltipLines(point({ valueWpm: 55, ref: [49, 57] }), views[0]!, "wpm").notes).toEqual([
      "Inside your usual range at the time",
    ]);
  });
});

describe("copy rules", () => {
  it("holds in every view", () => {
    expect(copy.plateauLine(72, 3, "wpm")).toBe(
      "Your speed has held around 72 wpm for about 3 weeks. A different word list or a longer test is a good way to move again.",
    );
    const sentences = [copy.CHART_TOO_FEW, copy.RANGE_EMPTY, copy.plateauLine(150, 1, "cpm")];
    const labels = [copy.RANGE_LABEL, copy.TABLE_SUMMARY, copy.FIELD_TESTS, copy.FIELD_FIRST];
    for (const v of views) {
      sentences.push(copy.rangeOne(v), copy.chartLabel(v), copy.tableCaption(v));
      labels.push(copy.fieldBest(v), ...Object.values(copy.legendLabels(v)), ...Object.values(copy.tableHeaders(v)));
      for (const p of [point(), point({ pb: true }), point({ day: v.daily })]) {
        const l = copy.tooltipLines(p, v, "wpm");
        labels.push(l.figure, ...l.notes);
        const note = copy.rowNote(p, v);
        if (note) labels.push(note);
      }
    }
    for (const s of sentences) expect(bannedPatterns(s), s).toEqual([]);
    for (const s of labels) expect(bannedPatterns(s, { heading: true }), s).toEqual([]);
  });
});
