import { describe, expect, it } from "vitest";
import type { State } from "@/app/_components/practice-reducer";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import type { LiveScreen } from "@/types/live";
import { cloneAnalysisSource } from "./clone-source";
import { cloneState } from "./clone-state";

/** The behaviour fields the live meta can carry; the rest are the defaults' shape. */
const BEHAVIOUR: BehaviourPrefs = {
  quickRestart: false,
  stopOnError: false,
  confidence: "off",
  allowExtras: true,
  strictSpace: false,
  blindMode: false,
  minWordLength: 0,
  showSecondary: false,
  excludeCasualFromAdapt: false,
  burstThreshold: 0,
};

const WORDS = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "again"];

/** A finished clone state: every word typed cleanly at about 180 ms a key. */
function doneState(over: Partial<State> = {}): State {
  const events: State["events"] = [];
  let t = 0;
  WORDS.forEach((w, wi) => {
    for (const ch of w) {
      events.push({ t, expected: ch, typed: ch, correct: true, wordIndex: wi });
      t += 180;
    }
    t += 200;
  });
  return {
    mode: "WORDS",
    length: WORDS.length,
    adapt: false,
    phase: "done",
    words: [...WORDS],
    cursorWord: WORDS.length,
    cursorChar: 0,
    errorWords: new Set(),
    totalChars: 40,
    correctChars: 40,
    startTime: 1_000_000,
    endTime: 1_000_000 + t,
    events,
    typed: [...WORDS],
    quoteSource: null,
    ...over,
  };
}

const build = (o: { state?: State; behaviour?: Partial<BehaviourPrefs>; windowStart?: number } = {}) =>
  cloneAnalysisSource({
    state: o.state ?? doneState(),
    behaviour: { ...BEHAVIOUR, ...o.behaviour },
    wordlist: "english",
    windowStart: o.windowStart,
  });

describe("cloneAnalysisSource", () => {
  it("builds a casual source from the frozen state", () => {
    const s = build()!;
    expect(s.bucket).toBe("casual|words|10");
    expect(s.fixMode).toBe("fix");
    expect(s.startedAt).toBe(1_000_000);
    expect(s.input.partial).toBe(false);
    expect(s.input.ctx?.input).toBe("keyboard");
    expect(s.input.ctx?.codeMatch).toBeUndefined();
    expect(analyseRun(s.input)).not.toBeNull();
  });
  it("a stop-on-error broadcaster gives block; backspace off gives none", () => {
    expect(build({ behaviour: { stopOnError: true } })!.fixMode).toBe("block");
    expect(build({ behaviour: { confidence: "all" } })!.fixMode).toBe("none");
  });
  it("an old broadcaster (no behaviour fields) reads as fix", () => {
    // The clone merges an old meta over DEFAULT_BEHAVIOUR: stop on error off, backspace on.
    expect(build({ behaviour: {} })!.fixMode).toBe("fix");
  });
  it("an Adapt run uses the training bucket", () => {
    expect(build({ state: doneState({ adapt: true }) })!.bucket).toBe("training|words|10");
  });
  it("a window that starts after word 0 marks the run partial", () => {
    expect(build({ windowStart: 12 })!.input.partial).toBe(true);
    expect(build({ windowStart: 0 })!.input.partial).toBe(false);
  });
  it("recomputes the final speed the way the submit does", () => {
    const s = build()!;
    const T = s.input.durationMs;
    // 40 letters + 9 spaces, all correct.
    expect(s.input.wpm).toBeCloseTo(((40 + 9) * (60 / (T / 1000))) / 5, 6);
  });
  it("nothing for BURST, a running state, or no keys", () => {
    expect(build({ state: doneState({ mode: "BURST" }) })).toBeNull();
    expect(build({ state: doneState({ phase: "running", endTime: null }) })).toBeNull();
    expect(build({ state: doneState({ events: [] }) })).toBeNull();
  });
});

const NOW = 5_000_000;
/** A done frame as the broadcaster sends it (live-screen-payload.ts). */
function frame(over: Partial<LiveScreen>): LiveScreen {
  return {
    phase: "done",
    typed: [],
    cursorWord: 0,
    cursorChar: 3,
    mode: "WORDS",
    length: 10,
    quoteSource: null,
    elapsedMs: 10_000,
    raw: 60,
    adapt: false,
    events: [],
    ...over,
  };
}
type Ev = NonNullable<LiveScreen["events"]>[number];
/** Clean keys for `words` from `t0`, `gap` ms apart, 200 ms between words. */
function keys(words: readonly string[], t0: number, gap: number, upTo = Infinity): Ev[] {
  const out: Ev[] = [];
  let t = t0;
  words.forEach((w, wi) => {
    for (const ch of w) {
      if (out.length >= upTo) return;
      out.push({ t, expected: ch, typed: ch, correct: true, wordIndex: wi });
      t += gap;
    }
    t += 200;
  });
  return out;
}

describe("a partial clone", () => {
  // What the result card shows for these is tested beside it
  // (run-analysis/finding-items.test.ts).
  const W = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", "and", "then",
    "some", "more", "words", "here", "for", "test", "again", "with", "them", "all"];

  it("a TIME window that starts at word 100 is analysed as partial", () => {
    // The last 20 words of a 60 s test: the window's keys run from 48 s
    // to 60 s on the run's clock, word indexes rebased to 0.
    const screen = frame({ mode: "TIME", length: 60, elapsedMs: 60_000, typed: W, cursorWord: 19, events: keys(W, 48_000, 110), windowStart: 100 });
    const s = cloneAnalysisSource({ state: cloneState(W, screen, NOW), behaviour: BEHAVIOUR, wordlist: "english", windowStart: 100 })!;
    expect(s.input.partial).toBe(true);
    expect(analyseRun(s.input)!.quality.partial).toBe(true);
  });
  it("a done frame cut at 3,000 keys is whole to the source, partial to the engine", () => {
    // 300 eleven-letter words, keys cut at the cap; the test ran on after them.
    const long = Array.from({ length: 300 }, (_, i) => `abcdefghij${String.fromCharCode(97 + (i % 26))}`);
    const ev = keys(long, 0, 100, 3_000);
    const screen = frame({ length: 300, elapsedMs: ev.at(-1)!.t + 40_000, typed: long, cursorWord: 299, events: ev, windowStart: 0 });
    const s = cloneAnalysisSource({ state: cloneState(long, screen, NOW), behaviour: BEHAVIOUR, wordlist: "english", windowStart: 0 })!;
    expect(s.input.partial).toBe(false);
    expect(analyseRun(s.input)!.quality.partial).toBe(true); // the engine's cap rule
  });
});
