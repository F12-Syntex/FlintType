import { describe, expect, it } from "vitest";
import { BackendError } from "@/lib/errors";
import { createLogger } from "@/server/logger";
import type { KeystrokeTiming, SubmitTestInput } from "@/types/adapt";
import { assertPlausibleRun } from "./plausibility";

const log = createLogger({ enabled: false });

/** `chars` correct keystrokes spread evenly over `spanMs`. */
function stream(chars: number, spanMs: number): KeystrokeTiming[] {
  return Array.from({ length: chars }, (_, i) => ({
    t: chars > 1 ? (i * spanMs) / (chars - 1) : 0,
    expected: "a",
    typed: "a",
    correct: true,
    wordIndex: Math.floor(i / 5),
  }));
}

function run(over: Partial<SubmitTestInput>): SubmitTestInput {
  return {
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_060_000,
    mode: "casual",
    durationOrWordCount: 60,
    wpm: 80,
    accuracy: 100,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    words: [],
    // 80 wpm for 60s = 400 words-of-5 = 2000 chars.
    timings: stream(2000, 59_000),
    ...over,
  };
}

describe("assertPlausibleRun", () => {
  it("accepts a run its keystrokes support", () => {
    expect(() => assertPlausibleRun(run({}), log, "u1")).not.toThrow();
  });

  it("rejects a claim the keystrokes can't support", () => {
    expect(() =>
      // 500 keystrokes in a minute support ~150 wpm at most.
      assertPlausibleRun(run({ wpm: 300, timings: stream(500, 59_000) }), log, "u1"),
    ).toThrow(BackendError);
  });

  it("rejects a completed run that ends before it starts", () => {
    expect(() =>
      assertPlausibleRun(
        run({ completedAt: 1_700_000_000_000 - 1 }),
        log,
        "u1",
      ),
    ).toThrow(BackendError);
  });

  it("rejects a sub-second fast run", () => {
    expect(() =>
      assertPlausibleRun(
        run({ completedAt: 1_700_000_000_100, timings: stream(10, 90) }),
        log,
        "u1",
      ),
    ).toThrow(BackendError);
  });

  it("skips the check below the verify floor and for incomplete runs", () => {
    expect(() =>
      assertPlausibleRun(run({ wpm: 30, timings: [] }), log, "u1"),
    ).not.toThrow();
    expect(() =>
      assertPlausibleRun(run({ wasCompleted: false, wpm: 400, timings: [] }), log, "u1"),
    ).not.toThrow();
  });
});
