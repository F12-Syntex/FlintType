import { describe, expect, it } from "vitest";
import { DEFAULT_BEHAVIOUR } from "@/lib/behaviour-prefs";
import { calcWpmAndRaw, keystrokeAccuracy, keystrokeErrors } from "@/lib/wpm";
import { avgWpm, consistencyScore, peakWpm, stallWpm } from "@/lib/wpm-stats";
import { submitTestInputSchema } from "@/types/adapt";
import { initialState, reducer, type Action, type KeyEvent, type Mode, type State, type WpmSample } from "./practice-reducer";
import {
  analysisSourceFor,
  buildSubmitInput,
  lengthModeOf,
  reachedWords,
  runContextFor,
  stateToRunInput,
  submitModeFor,
} from "./practice-submit";

/** The submit payload and the analysed RunInput (spec-20 §5.2, §8). */

const T0 = 1_700_000_000_000;
const key = (char: string, now: number, ht?: number): Action => ({
  type: "TYPE_CHAR", char, now: T0 + now, stopOnError: false, allowExtras: true, ...(ht !== undefined ? { ht } : {}),
});
const sp = (now: number): Action => ({ type: "SPACE", now: T0 + now, strictSpace: false });
const back = (now: number): Action => ({ type: "BACKSPACE", now: T0 + now });

function drive(mode: Mode, words: string[], acts: Action[], over: Partial<State> = {}): State {
  const s0 = reducer({ ...initialState, mode, length: words.length, adapt: false, ...over }, { type: "RESTART", words, quoteSource: null });
  return acts.reduce(reducer, s0);
}

/** "the cat sat": a slip fixed with one backspace, finished on the last letter. */
const fixture = () =>
  drive("WORDS", ["the", "cat", "sat"], [
    key("t", 0, 10), key("h", 120, 130), key("e", 230, 240), sp(330),
    key("c", 450), key("x", 560), back(700), key("a", 820), key("t", 930), sp(1_040),
    key("s", 1_160), key("a", 1_270), key("t", 1_380),
  ]);

const history: WpmSample[] = [{ t: 1_000, wpm: 60, raw: 66 }];
const ctxFor = (s: State, more: Partial<Parameters<typeof runContextFor>[0]> = {}) =>
  runContextFor({ behaviour: DEFAULT_BEHAVIOUR, wordlist: "english", mode: s.mode, suddenDeath: false, lockedWords: false, raceMode: false, state: s, ...more });

describe("buildSubmitInput", () => {
  it("keeps today's payload fields for a fixture", () => {
    const s = fixture();
    expect(s.phase).toBe("done");
    const p = buildSubmitInput({ state: s, history, raceMode: false, resetCount: 0, ctx: ctxFor(s) });
    const { wpm, raw } = calcWpmAndRaw(s.typed, s.words, s.endTime! - s.startTime!, true, s.events.length);
    // Exactly the object the old submit effect built.
    const today = {
      startedAt: s.startTime, completedAt: s.endTime, mode: "casual", durationOrWordCount: 3, lengthMode: "words",
      wpm, accuracy: keystrokeAccuracy(s.events), errorCount: keystrokeErrors(s.events), resetCount: 0, wasCompleted: true,
      words: s.words.slice(0, Math.min(s.cursorWord + 1, s.words.length)),
      timings: s.events.map(({ t, expected, typed, correct, wordIndex }) => ({ t, expected, typed, correct, wordIndex })),
      rawWpm: raw, peakWpm: Math.round(peakWpm(history)), avgWpm: Math.round(avgWpm(history)),
      stallWpm: Math.round(stallWpm(history)), consistency: consistencyScore(history), wpmHistory: history,
    };
    const { edits, spaces, ctx, timings, ...rest } = p;
    expect({ ...rest, timings: timings.map(({ t, expected, typed, correct, wordIndex }) => ({ t, expected, typed, correct, wordIndex })) }).toEqual(today);
    expect(edits).toHaveLength(1);
    expect(spaces).toHaveLength(2);
    expect(ctx).toEqual(ctxFor(s));
    expect(submitTestInputSchema.parse(JSON.parse(JSON.stringify(p)))).toEqual(JSON.parse(JSON.stringify(p)));
  });

  it("timings carry exactly the eight keys, undefined omitted", () => {
    const s = fixture();
    const leaky = { ...s, events: [{ ...s.events[0]!, src: "input", stray: 1 } as KeyEvent, { ...s.events[1]!, ht: undefined }] };
    const p = buildSubmitInput({ state: leaky, history, raceMode: false, resetCount: 0, ctx: {} });
    expect(Object.keys(p.timings[0]!).sort()).toEqual(["correct", "expected", "ht", "pos", "src", "t", "typed", "wordIndex"]);
    expect(Object.keys(p.timings[1]!).sort()).toEqual(["correct", "expected", "pos", "t", "typed", "wordIndex"]);
  });

  it("sends edits and spaces only when the State has them", () => {
    const s = fixture();
    const p = buildSubmitInput({ state: { ...s, edits: undefined, spaces: undefined }, history, raceMode: false, resetCount: 0, ctx: {} });
    expect("edits" in p).toBe(false);
    expect("spaces" in p).toBe(false);
  });

  it("passes resetCount through, capped at the schema's 10,000", () => {
    const s = fixture();
    const at = (n: number) => buildSubmitInput({ state: s, history, raceMode: false, resetCount: n, ctx: {} }).resetCount;
    expect(at(3)).toBe(3);
    expect(at(12_000)).toBe(10_000);
  });

  it("maps the mode and length unit as before", () => {
    expect([submitModeFor(false, true), submitModeFor(true, true), submitModeFor(true, false), submitModeFor(false, false)])
      .toEqual(["race", "race", "training", "casual"]);
    expect((["WORDS", "TIME", "QUOTE"] as Mode[]).map(lengthModeOf)).toEqual(["words", "time", "quote"]);
  });
});

describe("runContextFor", () => {
  const s = fixture();
  it("carries every flag", () => {
    const behaviour = { ...DEFAULT_BEHAVIOUR, stopOnError: false, allowExtras: false, strictSpace: true, confidence: "word" as const, showSecondary: true };
    expect(runContextFor({ behaviour, wordlist: "english_1k", mode: "WORDS", suddenDeath: false, lockedWords: true, raceMode: false, state: s })).toEqual({
      stopOnError: false, allowExtras: false, strictSpace: true, confidence: "word", suddenDeath: false,
      drill: true, race: false, punctuation: true, input: "keyboard", wordlist: "english_1k",
    });
  });

  it("sudden death forces stop on error; a race is never a drill; QUOTE has no wordlist", () => {
    const c = ctxFor(s, { suddenDeath: true, lockedWords: true });
    expect([c.stopOnError, c.suddenDeath, c.drill]).toEqual([true, true, true]);
    expect(ctxFor(s, { raceMode: true, lockedWords: true })).toMatchObject({ race: true, drill: false });
    expect("wordlist" in ctxFor(s, { mode: "QUOTE" })).toBe(false);
  });

  it("reads the input kind from the events", () => {
    const touch = { ...s, events: s.events.map((e) => ({ ...e, src: "input" as const })) };
    expect(ctxFor(touch).input).toBe("touch");
    expect(ctxFor({ ...s, events: [touch.events[0]!, s.events[1]!] }).input).toBe("mixed");
  });

  it("codeMatch is absent under 20 letters and rounded to 3 dp above", () => {
    expect("codeMatch" in ctxFor({ ...s, layoutHits: [19, 19] })).toBe(false);
    expect(ctxFor({ ...s, layoutHits: [20, 19] }).codeMatch).toBe(0.95);
    expect(ctxFor({ ...s, layoutHits: [30, 29] }).codeMatch).toBe(0.967);
    expect("codeMatch" in ctxFor({ ...s, layoutHits: undefined })).toBe(false);
  });

  it("passes capped through, and omits it otherwise", () => {
    expect(ctxFor({ ...s, capped: true }).capped).toBe(true);
    expect("capped" in ctxFor(s)).toBe(false);
  });
});

describe("reachedWords and stateToRunInput", () => {
  it("reachedWords is today's slice for WORDS, QUOTE and TIME", () => {
    const words = drive("WORDS", ["ab", "cd", "ef"], [key("a", 0), sp(50)]);
    expect(reachedWords(words)).toEqual(["ab", "cd"]);
    const quote = drive("QUOTE", ["one", "two"], [key("o", 0), key("n", 50), key("e", 90), sp(130), key("t", 170), key("w", 210), key("o", 250)]);
    expect(quote.phase).toBe("done");
    expect(reachedWords(quote)).toEqual(["one", "two"]);
    const buffer = Array.from({ length: 300 }, (_, i) => `w${i}`);
    const time = reducer(drive("TIME", buffer, [key("w", 0), key("0", 50), sp(90), key("w", 130)]), { type: "FINISH_TIME", now: T0 + 15_000 });
    expect(reachedWords(time)).toEqual(["w0", "w1"]);
  });

  it("both builders use reachedWords", () => {
    const buffer = Array.from({ length: 300 }, (_, i) => `w${i}`);
    const s = reducer(drive("TIME", buffer, [key("w", 0), key("0", 50), sp(90), key("w", 130)]), { type: "FINISH_TIME", now: T0 + 15_000 });
    const input = stateToRunInput(s, {}, 4)!;
    expect(input.words).toEqual(reachedWords(s));
    expect(input.typedFinal).toEqual(["w0", "w"]);
    expect(input.lengthMode).toBe("time");
    expect(input.durationMs).toBe(15_000);
    expect(buildSubmitInput({ state: s, history, raceMode: false, resetCount: 0, ctx: {} }).words).toEqual(reachedWords(s));
  });

  it("returns null for BURST, an unfinished run and a run with no keys", () => {
    const done = fixture();
    expect(stateToRunInput({ ...done, mode: "BURST" }, {}, 50)).toBeNull();
    expect(stateToRunInput({ ...done, endTime: null }, {}, 50)).toBeNull();
    expect(stateToRunInput({ ...done, events: [] }, {}, 50)).toBeNull();
  });

  it("omits ctx and the marks when there are none", () => {
    const s = fixture();
    const input = stateToRunInput({ ...s, edits: undefined, spaces: undefined }, undefined, 50)!;
    expect(["ctx", "edits", "spaces"].some((k) => k in input)).toBe(false);
  });
});

describe("analysisSourceFor", () => {
  it("names the bucket, fix mode and start, with the submit's wpm", () => {
    const s = { ...fixture(), adapt: true };
    const src = analysisSourceFor({ state: s, ctx: ctxFor(s), raceMode: false })!;
    expect(src.bucket).toBe("training|words|3");
    expect(src.fixMode).toBe("fix");
    expect(src.startedAt).toBe(s.startTime);
    expect(src.input.wpm).toBe(buildSubmitInput({ state: s, history, raceMode: false, resetCount: 0, ctx: {} }).wpm);
  });

  it("gives touch runs their own bucket and a race its own mode", () => {
    const s = fixture();
    const touch = { ...s, events: s.events.map((e) => ({ ...e, src: "input" as const })) };
    expect(analysisSourceFor({ state: touch, ctx: ctxFor(touch), raceMode: false })!.bucket).toBe("casual|words|3|t");
    expect(analysisSourceFor({ state: s, ctx: ctxFor(s, { raceMode: true }), raceMode: true })!.bucket).toBe("race|words|3");
    expect(analysisSourceFor({ state: s, ctx: { stopOnError: true }, raceMode: false })!.fixMode).toBe("block");
  });

  it("is null when there is nothing to analyse", () => {
    const s = fixture();
    expect(analysisSourceFor({ state: { ...s, mode: "BURST" }, ctx: {}, raceMode: false })).toBeNull();
    expect(analysisSourceFor({ state: { ...s, startTime: null }, ctx: {}, raceMode: false })).toBeNull();
  });
});
