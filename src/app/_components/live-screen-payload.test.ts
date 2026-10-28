import { describe, expect, it } from "vitest";
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

  it("an invalid block drops to undefined instead of rejecting the push", () => {
    const parsed = liveProgressInputSchema.safeParse({
      ...base,
      screen: { ...screen, burst: { summary: { wpm: "fast" }, buckets: [] } },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.screen?.burst).toBeUndefined();
  });
});
