import { afterEach, describe, expect, it, vi } from "vitest";
import { liveProgressInputSchema } from "@/types/live";
import { LIVE_MAX_CHART_SAMPLES } from "@/types/live-burst";
import { burstResult, type BurstTry } from "./burst-stats";
import { appendBurstTry } from "./burst-tries";
import {
  buildLiveScreen,
  liveBurstFigures,
  type LiveScreenSource,
} from "./live-screen-payload";
import { liveSnapshotWindow } from "./practice-progress";
import type { State } from "./practice-reducer";

/** Done-frame fixture: a finished run over `words`. Meta is never read
 *  (every build here is a lean frame), so the prefs are stubs. */
function source(
  mode: State["mode"],
  words: string[],
  wpmHistory: LiveScreenSource["wpmHistory"] = [{ t: 1000, wpm: 40, raw: 50 }],
): LiveScreenSource {
  const state: State = {
    mode,
    length: words.length,
    adapt: false,
    phase: "done",
    words,
    cursorWord: words.length,
    cursorChar: 0,
    errorWords: new Set(),
    totalChars: 10,
    correctChars: 10,
    startTime: 0,
    endTime: 5000,
    events: [{ t: 10, expected: "a", typed: "a", correct: true, wordIndex: 0 }],
    typed: [...words],
    quoteSource: null,
  };
  return {
    state,
    raw: 50,
    elapsedMs: 5000,
    wpmHistory,
    appearance: {} as LiveScreenSource["appearance"],
    caret: {} as LiveScreenSource["caret"],
    behaviour: {} as LiveScreenSource["behaviour"],
  };
}

function tryOf(over: Partial<BurstTry>): BurstTry {
  return {
    endT: 1000,
    ms: 400,
    keys: 4,
    chars: 4,
    endedBySpace: true,
    cleared: true,
    ...over,
  };
}

/** Build the frame and send it through the real wire schema, the way
 *  `live.progress` receives it. */
function pushed(src: LiveScreenSource) {
  const win = liveSnapshotWindow(src.state, 300);
  const screen = buildLiveScreen(src, win, false);
  return liveProgressInputSchema.parse({
    words: win.words,
    progressChars: win.progressChars,
    totalChars: win.totalChars,
    wpm: 40,
    accuracy: 100,
    screen,
  }).screen;
}

describe("buildLiveScreen — done frame", () => {
  it("carries a BURST run's result figures, rolled up from its tries", () => {
    const words = ["fire", "stone", "ember"];
    const tries = [
      tryOf({ endT: 900, ms: 300, chars: 4 }),
      tryOf({ endT: 1500, ms: 250, keys: 2, chars: 5, cleared: false, endedBySpace: false }),
      tryOf({ endT: 2600, ms: 500, keys: 5, chars: 5 }),
      tryOf({ endT: 4100, ms: 600, keys: 5, chars: 5 }),
    ];
    for (const t of tries) appendBurstTry(words, t);
    const screen = pushed(source("BURST", words));
    const expected = burstResult(tries);
    expect(expected).not.toBeNull();
    // Exactly what the broadcaster's own results screen computes.
    expect(screen?.burst).toEqual(expected);
    expect(screen?.burst?.summary.tries).toBe(4);
    expect(screen?.burst?.summary.cleared).toBe(3);
  });

  it("drops the regular chart samples when the burst block carries its own", () => {
    const words = ["quick", "flint"];
    appendBurstTry(words, tryOf({}));
    const screen = pushed(source("BURST", words));
    expect(screen?.burst?.buckets.length).toBeGreaterThan(0);
    expect(screen?.wpmHistory).toEqual([]);
  });

  it("sends no burst block before any try has cleared, and keeps the regular chart", () => {
    const words = ["only", "misses"];
    appendBurstTry(words, tryOf({ cleared: false }));
    const screen = pushed(source("BURST", words));
    expect(screen?.burst).toBeUndefined();
    expect(screen?.wpmHistory).toEqual([{ t: 1000, wpm: 40, raw: 50 }]);
  });

  it("rolls the burst figures up once per try, not on every push", () => {
    const words = ["cached", "figures"];
    appendBurstTry(words, tryOf({ endT: 800 }));
    const first = liveBurstFigures(words);
    expect(first).not.toBeNull();
    // A watched results screen re-sends the same block.
    expect(liveBurstFigures(words)).toBe(first);
    // A new try is a new log, so the figures are rolled up again.
    appendBurstTry(words, tryOf({ endT: 2000, ms: 300 }));
    const second = liveBurstFigures(words);
    expect(second).not.toBe(first);
    expect(second?.summary.tries).toBe(2);
  });

  it("sends no burst block for other modes", () => {
    const words = ["plain", "words"];
    appendBurstTry(words, tryOf({}));
    expect(pushed(source("WORDS", words))?.burst).toBeUndefined();
  });

  it("carries whether the run is adaptive, for the clone's mode bar", () => {
    const src = source("WORDS", ["adaptive", "run"]);
    expect(pushed({ ...src, state: { ...src.state, adapt: true } })?.adapt).toBe(true);
    expect(pushed(src)?.adapt).toBe(false);
  });

  it("keeps the latest chart samples of a marathon run within the wire cap", () => {
    const history = Array.from({ length: LIVE_MAX_CHART_SAMPLES + 25 }, (_, i) => ({
      t: (i + 1) * 1000,
      wpm: 50,
      raw: 60,
    }));
    const screen = pushed(source("WORDS", ["long", "run"], history));
    expect(screen?.wpmHistory).toHaveLength(LIVE_MAX_CHART_SAMPLES);
    expect(screen?.wpmHistory?.at(-1)?.t).toBe(history.at(-1)?.t);
  });
});

describe("buildLiveScreen — what the clone's analysis needs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("the meta block carries blind mode and the four fix settings", () => {
    // A meta frame reads the theme vars off <html>; node has no document.
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "" }));
    const src = source("WORDS", ["meta", "frame"]);
    const behaviour = {
      blindMode: true,
      stopOnError: true,
      allowExtras: false,
      strictSpace: true,
      confidence: "word",
      quickRestart: true,
    } as unknown as LiveScreenSource["behaviour"];
    const win = liveSnapshotWindow(src.state, 300);
    const screen = buildLiveScreen({ ...src, behaviour }, win, true);
    const parsed = liveProgressInputSchema.parse({ words: win.words, progressChars: 0, totalChars: 10, wpm: 40, accuracy: 100, screen });
    expect(parsed.screen?.behaviour).toEqual({ blindMode: true, stopOnError: true, allowExtras: false, strictSpace: true, confidence: "word" });
  });

  it("windowStart is the first word of the event window", () => {
    const words = Array.from({ length: 400 }, (_, i) => `w${i}`);
    const src = source("TIME", words);
    const state = { ...src.state, cursorWord: 350 };
    const win = liveSnapshotWindow(state, 300);
    expect(win.start).toBeGreaterThan(0);
    const screen = buildLiveScreen({ ...src, state }, win, false);
    expect(screen.windowStart).toBe(win.start);
    expect(pushed(source("WORDS", ["short", "run"]))?.windowStart).toBe(0);
  });

  it("a v2 run's live events carry only the five old fields", () => {
    const src = source("WORDS", ["ab", "cd"]);
    const state: State = {
      ...src.state,
      events: [{ t: 10, expected: "a", typed: "a", correct: true, wordIndex: 0, pos: 0, src: "input", ht: 12.5 }],
      edits: [{ t: 20, at: 1, seq: 0, wordIndex: 0, pos: 1, kind: "back" }],
      spaces: [{ t: 30, at: 1, seq: 1, wordIndex: 0, pos: 1 }],
    };
    const screen = buildLiveScreen({ ...src, state }, liveSnapshotWindow(state, 300), false);
    expect(screen.events).toEqual([{ t: 10, expected: "a", typed: "a", correct: true, wordIndex: 0 }]);
    expect(Object.keys(screen)).not.toContain("edits");
    expect(Object.keys(screen)).not.toContain("spaces");
  });
});

describe("live screen schema — fields old clients may omit", () => {
  const base = {
    words: ["a", "b"],
    progressChars: 3,
    totalChars: 3,
    wpm: 40,
    accuracy: 100,
  };
  const screen = {
    phase: "done",
    typed: ["a", "b"],
    cursorWord: 2,
    cursorChar: 0,
    mode: "BURST",
    length: 2,
    quoteSource: null,
    elapsedMs: 4000,
    raw: 50,
  };

  it("an old client without the block still parses", () => {
    const parsed = liveProgressInputSchema.parse({ ...base, screen });
    expect(parsed.screen?.burst).toBeUndefined();
    expect(parsed.screen?.adapt).toBeUndefined();
  });

  it("an invalid adapt flag drops to undefined instead of rejecting the push", () => {
    const parsed = liveProgressInputSchema.safeParse({
      ...base,
      screen: { ...screen, adapt: "yes" },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.screen?.adapt).toBeUndefined();
  });

  it("an old broadcaster's behaviour and done frame still parse; bad new fields drop", () => {
    const old = liveProgressInputSchema.parse({ ...base, screen: { ...screen, behaviour: { blindMode: false } } });
    expect(old.screen?.behaviour).toEqual({ blindMode: false });
    expect(old.screen?.windowStart).toBeUndefined();
    const bad = liveProgressInputSchema.safeParse({
      ...base,
      screen: { ...screen, windowStart: -3, behaviour: { blindMode: true, confidence: "sometimes", stopOnError: "yes" } },
    });
    expect(bad.success).toBe(true);
    expect(bad.data?.screen?.windowStart).toBeUndefined();
    expect(bad.data?.screen?.behaviour).toEqual({ blindMode: true });
  });

  it("an invalid block drops to undefined instead of rejecting the push", () => {
    const parsed = liveProgressInputSchema.safeParse({
      ...base,
      screen: { ...screen, burst: { summary: { wpm: "fast" }, buckets: [] } },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.screen?.burst).toBeUndefined();
  });
});
