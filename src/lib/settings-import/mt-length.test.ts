import { describe, expect, it } from "vitest";
import { bannedPatterns } from "../copy-rules";
import { validLength } from "./ft-values";
import { mapLength, type PracticeNow } from "./mt-length";
import { MtCollector } from "./mt-values";

const length = (mt: Record<string, unknown>, mode: string, current: PracticeNow = { mode: "WORDS", length: 25 }) => {
  const col = new MtCollector(mt);
  mapLength(col, mode, current);
  return { col, item: col.out.find((c) => c.id === "practice.length") };
};
const FILE = { time: 15, words: 25, quoteLength: [0, 1, 2, 3] };

describe("mapLength", () => {
  it("reads only the length for the mode, and counts only that key as used", () => {
    const time = length(FILE, "TIME");
    expect(time.item).toMatchObject({ value: 15, to: "15 seconds" });
    expect([...time.col.used]).toEqual(["time"]);
    const words = length(FILE, "WORDS");
    expect(words.item).toMatchObject({ value: 25 });
    expect([...words.col.used]).toEqual(["words"]);
    const quote = length(FILE, "QUOTE");
    expect(quote.item).toMatchObject({ value: 1 });
    expect([...quote.col.used]).toEqual(["quoteLength"]);
  });

  it("reads every bracket as MonkeyType's All, which becomes Medium, and says so", () => {
    for (const quoteLength of [[0, 1, 2, 3], [3, 2, 1, 0, 2], [-1], []]) {
      const { col, item } = length({ quoteLength }, "QUOTE");
      expect(item).toMatchObject({ value: 1, to: "Medium", origin: "From All" });
      expect(col.notes).toEqual([{ group: "test", text: "One quote length plays at a time, so Medium is used." }]);
      expect(bannedPatterns(col.notes[0].text)).toEqual([]);
    }
  });

  it("takes the shortest of several brackets, and says only one is played", () => {
    const { col, item } = length({ quoteLength: [2, 0] }, "QUOTE");
    expect(item).toMatchObject({ value: 0, to: "Short", origin: "From Short, Long" });
    expect(col.notes).toEqual([{ group: "test", text: "One quote length plays at a time, so Short is used." }]);
  });

  it("adds no note for a single bracket", () => {
    const { col, item } = length({ quoteLength: [2] }, "QUOTE");
    expect(item).toMatchObject({ value: 2, origin: "From Long" });
    expect(col.notes).toEqual([]);
  });

  it("lists a length that can't be used, and still lands on one that runs", () => {
    const { col, item } = length({ time: -1 }, "TIME", { mode: "QUOTE", length: 2 });
    expect(col.skipped).toEqual([expect.objectContaining({ key: "time", reason: "bad-value", note: "Endless tests aren't available." })]);
    expect(item).toMatchObject({ origin: "Default for this mode" });
    expect(validLength("TIME", item?.value)).toBeDefined();
  });

  it("reads a length the file leaves out as MonkeyType's default", () => {
    expect(length({}, "TIME").item).toMatchObject({ value: 30 });
    expect(length({}, "WORDS").item).toMatchObject({ value: 50 });
    expect(length({}, "QUOTE").item).toMatchObject({ value: 1, to: "Medium" });
  });
});
