import { describe, expect, it } from "vitest";
import { countAbandon, NO_ABANDONS, resetCountFor } from "./practice-abandons";
import { initialState, type KeyEvent, type State } from "./practice-reducer";

/** The resetCount tally (spec-20 §5.3). */

const key: KeyEvent = { t: 0, expected: "a", typed: "a", correct: true, wordIndex: 0 };
const run = (over: Partial<State> = {}): State => ({
  ...initialState,
  mode: "WORDS",
  length: 25,
  adapt: false,
  phase: "running",
  events: [key],
  ...over,
});

describe("countAbandon", () => {
  it("counts each abandoned run of the same kind", () => {
    let t = NO_ABANDONS;
    for (let i = 0; i < 3; i++) t = countAbandon(t, run());
    expect(t.n).toBe(3);
    expect(resetCountFor(t, run())).toBe(3);
  });

  it("counts only a run in progress with at least one key", () => {
    expect(countAbandon(NO_ABANDONS, run({ phase: "rest", events: [] }))).toBe(NO_ABANDONS);
    expect(countAbandon(NO_ABANDONS, run({ events: [] }))).toBe(NO_ABANDONS);
    // Restarting from the result screen abandons nothing.
    expect(countAbandon(NO_ABANDONS, run({ phase: "done" }))).toBe(NO_ABANDONS);
  });

  it("never counts BURST, whose runs are never submitted", () => {
    let t = NO_ABANDONS;
    for (let i = 0; i < 3; i++) t = countAbandon(t, run({ mode: "BURST" }));
    expect(t).toBe(NO_ABANDONS);
    expect(resetCountFor(t, run())).toBe(0);
  });

  it("starts over when a run of another kind is abandoned", () => {
    let t = countAbandon(countAbandon(NO_ABANDONS, run()), run());
    t = countAbandon(t, run({ mode: "TIME", length: 30 }));
    expect(resetCountFor(t, run({ mode: "TIME", length: 30 }))).toBe(1);
    expect(resetCountFor(t, run())).toBe(0);
  });
});

describe("resetCountFor", () => {
  it("is 0 for a submitted run of another mode, length or adapt pref", () => {
    const t = countAbandon(countAbandon(NO_ABANDONS, run()), run());
    expect(resetCountFor(t, run())).toBe(2);
    expect(resetCountFor(t, run({ mode: "QUOTE" }))).toBe(0);
    expect(resetCountFor(t, run({ length: 50 }))).toBe(0);
    expect(resetCountFor(t, run({ adapt: true }))).toBe(0);
  });

  it("is 0 with nothing abandoned", () => {
    expect(resetCountFor(NO_ABANDONS, run())).toBe(0);
  });
});
