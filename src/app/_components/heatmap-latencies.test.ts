import { describe, expect, it } from "vitest";

import { buildHeatmapLatencies } from "./heatmap-latencies";
import type { KeyEvent } from "./practice-reducer";

/** Minimal correct/incorrect keystroke fixture; only the fields the walk
 *  reads (`t`, `correct`, `wordIndex`) matter. */
function ev(t: number, correct: boolean, wordIndex: number): KeyEvent {
  return { t, correct, wordIndex, expected: "x", typed: "x" };
}

describe("buildHeatmapLatencies", () => {
  it("maps each correct keystroke to its word:col, latency = gap since prev correct", () => {
    const words = ["ab", "cd"];
    const events: KeyEvent[] = [
      ev(0, true, 0),
      ev(100, true, 0),
      ev(250, true, 1),
      ev(300, true, 1),
    ];
    const map = buildHeatmapLatencies(words, events);
    expect(map.get("0:0")).toBe(0);
    expect(map.get("0:1")).toBe(100);
    expect(map.get("1:0")).toBe(150);
    expect(map.get("1:1")).toBe(50);
  });

  it("a skipped word does not shift later words' latencies (FT-066)", () => {
    // User typed "th" of word 0, then jumped straight to word 2.
    const words = ["the", "cat", "dog"];
    const events: KeyEvent[] = [
      ev(0, true, 0),
      ev(80, true, 0),
      ev(200, true, 2),
      ev(260, true, 2),
    ];
    const map = buildHeatmapLatencies(words, events);
    // Word 1 was never typed — nothing lands on it.
    expect(map.has("1:0")).toBe(false);
    // The two word-2 keystrokes land on word 2, NOT shifted onto word 1.
    expect(map.get("2:0")).toBe(120);
    expect(map.get("2:1")).toBe(60);
  });

  it("a wrong char (stop-on-error off) consumes its column without being recorded", () => {
    const words = ["abc"];
    const events: KeyEvent[] = [
      ev(0, true, 0),
      ev(50, false, 0), // wrong at column 1 — advances the cursor, not recorded
      ev(120, true, 0),
    ];
    const map = buildHeatmapLatencies(words, events);
    expect(map.get("0:0")).toBe(0);
    expect(map.has("0:1")).toBe(false); // the mistyped column stays unrecorded
    expect(map.get("0:2")).toBe(120); // latency measured from the last *correct* key
  });

  it("over-typing within a word cannot overflow into the next word's positions", () => {
    const words = ["ab", "cd"];
    const events: KeyEvent[] = [
      ev(0, true, 0),
      ev(50, true, 0),
      ev(90, true, 0), // extra keystroke past word length — capped, not recorded
      ev(150, true, 1),
    ];
    const map = buildHeatmapLatencies(words, events);
    expect(map.get("0:0")).toBe(0);
    expect(map.get("0:1")).toBe(50);
    expect(map.has("0:2")).toBe(false); // capped at word length
    expect(map.get("1:0")).toBe(60); // word change resets the column to 0
    expect(map.has("1:1")).toBe(false);
  });

  it("returns an empty map for no events", () => {
    expect(buildHeatmapLatencies(["ab"], []).size).toBe(0);
  });
});
