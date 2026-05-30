import { describe, expect, it } from "vitest";
import type { KeyEvent } from "./practice-reducer";
import { reconstructCursor } from "./replay-cursor";

/** Build a keystroke event. `wordIndex` is the authoritative field the
 *  reconstruction reads; `correct` defaults to true. */
function ev(wordIndex: number, typed: string, correct = true): KeyEvent {
  return { t: 0, expected: typed, typed, correct, wordIndex };
}

/** Type a word fully and correctly: one correct event per character, all
 *  stamped with the same wordIndex. */
function typeWord(wordIndex: number, word: string): KeyEvent[] {
  return [...word].map((ch) => ev(wordIndex, ch));
}

describe("reconstructCursor", () => {
  it("returns the origin with no events", () => {
    const r = reconstructCursor([], ["the", "cat"], 0);
    expect(r).toEqual({ wordIdx: 0, charIdx: 0, errorWords: new Set() });
  });

  it("tracks the caret through perfectly-typed words", () => {
    const words = ["the", "cat", "ran"];
    const events = [
      ...typeWord(0, "the"),
      ...typeWord(1, "cat"),
      ...typeWord(2, "ra"), // mid third word
    ];
    const r = reconstructCursor(events, words, events.length);
    expect(r.wordIdx).toBe(2);
    expect(r.charIdx).toBe(2);
    expect(r.errorWords.size).toBe(0);
  });

  it("advances by the recorded wordIndex even when a word is left incomplete", () => {
    // The regression: each word is spaced one char early, so a length-counting
    // reconstruction never completes a word and sticks near the start. With
    // wordIndex the caret follows the real progression.
    const words = ["they", "good", "down", "year"];
    const events = [
      ...typeWord(0, "the"), // skipped final 'y', spaced on
      ...typeWord(1, "goo"), // skipped 'd'
      ...typeWord(2, "dow"), // skipped 'n'
      ...typeWord(3, "yea"), // skipped 'r'
    ];
    const r = reconstructCursor(events, words, events.length);
    // Old behaviour stuck at wordIdx 0/1; the fix lands on the 4th word.
    expect(r.wordIdx).toBe(3);
    expect(r.charIdx).toBe(3);
  });

  it("does not lag behind the replay percentage on a long imperfect run", () => {
    // 40 words, each spaced one char early — mirrors the one-minute repro.
    const words = Array.from({ length: 40 }, () => "about");
    const events = words.flatMap((_, i) => typeWord(i, "abou")); // 4 of 5 chars
    // Halfway through the event stream the caret should be ~halfway through
    // the words, not pinned near zero.
    const half = Math.floor(events.length / 2);
    const r = reconstructCursor(events, words, half);
    // ~20 words in (160 events / 2 = 80 = 20 words of 4 chars). The old
    // length-counting reconstruction stuck near 0 here.
    expect(r.wordIdx).toBeGreaterThanOrEqual(18);
    expect(r.wordIdx).toBeLessThanOrEqual(20);
  });

  it("flags every word that carries a mistyped character", () => {
    const words = ["the", "cat"];
    const events = [
      ev(0, "t"),
      ev(0, "x", false), // mistype in word 0
      ev(0, "e"),
      ...typeWord(1, "cat"),
    ];
    const r = reconstructCursor(events, words, events.length);
    expect(r.errorWords.has(0)).toBe(true);
    expect(r.errorWords.has(1)).toBe(false);
  });

  it("caps the caret column at the word length when extras were typed", () => {
    const words = ["hi"];
    // "hiiii" — extras past the 2-char word.
    const events = [ev(0, "h"), ev(0, "i"), ev(0, "i"), ev(0, "i")];
    const r = reconstructCursor(events, words, events.length);
    expect(r.wordIdx).toBe(0);
    expect(r.charIdx).toBe(2); // clamped to "hi".length
  });

  it("clamps upTo to the available events", () => {
    const words = ["the"];
    const events = typeWord(0, "th");
    const r = reconstructCursor(events, words, 999);
    expect(r.wordIdx).toBe(0);
    expect(r.charIdx).toBe(2);
  });
});
