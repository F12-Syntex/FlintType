import { describe, expect, it } from "vitest";
import {
  type BurstConfig,
  type BurstState,
  burstAccuracy,
  burstReducer,
  burstWpm,
  currentItem,
  initialBurstState,
  isReady,
} from "./burst-reducer";

const CONFIG: BurstConfig = { items: ["cat", "dog"], thresholdWpm: 60, repsPerItem: 2 };

/** Type `text` one key at a time, `msPerKey` apart, starting at `t0`. */
function type(
  state: BurstState,
  text: string,
  { t0 = 1000, msPerKey = 50, config = CONFIG } = {},
): BurstState {
  let s = state;
  [...text].forEach((char, i) => {
    s = burstReducer(s, { type: "KEY", char, now: t0 + i * msPerKey, config });
  });
  return s;
}

describe("burstWpm", () => {
  it("uses 5 chars per word", () => {
    expect(burstWpm(5, 1000)).toBe(60);
  });
  it("floors the duration at 1ms", () => {
    expect(burstWpm(5, 0)).toBe(burstWpm(5, 1));
  });
});

describe("typing an item", () => {
  it("accepts correct characters and starts the clock on the first", () => {
    const s = type(initialBurstState, "ca");
    expect(s.typed).toBe("ca");
    expect(s.attemptStartedAt).toBe(1000);
    expect(isReady(s, "cat")).toBe(false);
  });

  it("is ready once the whole item is typed, until space commits it", () => {
    const s = type(initialBurstState, "cat");
    expect(isReady(s, currentItem(s, CONFIG))).toBe(true);
    expect(s.totalAttempts).toBe(0);
  });

  it("a wrong character is a miss and resets the streak", () => {
    let s = type(initialBurstState, "cat ");
    expect(s.reps).toBe(1);
    s = type(s, "cx");
    expect(s.lastOutcome).toBe("wrong");
    expect(s.reps).toBe(0);
    expect(s.typed).toBe("");
    expect(s.totalAttempts).toBe(2);
  });

  it("a key past the end of the item is a miss", () => {
    const s = type(initialBurstState, "catt");
    expect(s.lastOutcome).toBe("wrong");
  });

  it("ignores a stray space mid-item", () => {
    const s = type(initialBurstState, "c a");
    expect(s.typed).toBe("ca");
    expect(s.lastOutcome).toBeNull();
  });

  it("types real spaces inside a pangram", () => {
    const config = { ...CONFIG, items: ["a b"] };
    const s = type(initialBurstState, "a b", { config });
    expect(s.typed).toBe("a b");
  });
});

describe("committing with space", () => {
  it("counts a fast commit as a rep", () => {
    // 3 chars over 100ms then space at +150ms: far above 60 wpm.
    const s = type(initialBurstState, "cat ");
    expect(s.lastOutcome).toBe("win");
    expect(s.reps).toBe(1);
    expect(s.itemIdx).toBe(0);
    expect(s.lastWpm).toBeGreaterThan(60);
  });

  it("a slow commit resets the streak and records the speed", () => {
    let s = type(initialBurstState, "cat ");
    s = type(s, "cat ", { t0: 5000, msPerKey: 1000 });
    expect(s.lastOutcome).toBe("slow");
    expect(s.reps).toBe(0);
    expect(s.lastWpm).toBe(Math.round(burstWpm(3, 3000)));
  });

  it("advances after enough reps and finishes on the last item", () => {
    let s = type(initialBurstState, "cat cat ");
    expect(s.itemIdx).toBe(1);
    expect(s.reps).toBe(0);
    s = type(s, "dog dog ");
    expect(s.finished).toBe(true);
    expect(s.totalWins).toBe(4);
    expect(currentItem(s, CONFIG)).toBe("");
    // Keys after the finish do nothing.
    expect(type(s, "x")).toBe(s);
  });
});

describe("editing and restarting", () => {
  it("backspace removes one character; word-wise clears the attempt", () => {
    let s = type(initialBurstState, "ca");
    s = burstReducer(s, { type: "BACKSPACE" });
    expect(s.typed).toBe("c");
    s = burstReducer(s, { type: "BACKSPACE_WORD" });
    expect(s.typed).toBe("");
    expect(s.attemptStartedAt).toBeNull();
    expect(burstReducer(s, { type: "BACKSPACE" })).toBe(s);
  });

  it("clears the outcome flash", () => {
    const s = type(initialBurstState, "x");
    expect(burstReducer(s, { type: "RESET_FLASH" }).lastOutcome).toBeNull();
  });

  it("RESTART returns to the start", () => {
    const s = type(initialBurstState, "cat cat dog dog ");
    expect(s.finished).toBe(true);
    expect(burstReducer(s, { type: "RESTART" })).toEqual(initialBurstState);
  });
});

describe("burstAccuracy", () => {
  it("is 100 before any attempt and wins over attempts after", () => {
    expect(burstAccuracy(initialBurstState)).toBe(100);
    const s = type(type(initialBurstState, "cat "), "x");
    expect(burstAccuracy(s)).toBe(50);
  });
});
