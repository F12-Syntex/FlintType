import { afterEach, describe, expect, it } from "vitest";
import {
  isRaceInputCurrentlyLocked,
  isRaceInputLocked,
  setRaceInputLocked,
} from "./race-input";

// The live lock flag is module-global; reset after every test so cases
// don't leak into one another (and so a failed assertion can't strand
// the suite in a locked state).
afterEach(() => setRaceInputLocked(false));

describe("isRaceInputLocked (phase predicate)", () => {
  it("locks input during every pre-race phase", () => {
    expect(isRaceInputLocked("matching")).toBe(true);
    expect(isRaceInputLocked("lobby")).toBe(true);
    expect(isRaceInputLocked("countdown")).toBe(true);
  });

  it("allows input only while racing, and locks once finished", () => {
    // #11: the "finished" phase (whole race over) is now locked so a
    // racer can't keep typing into the passage after the race ends.
    expect(isRaceInputLocked("racing")).toBe(false);
    expect(isRaceInputLocked("finished")).toBe(true);
  });

  it("locks a racer who has already crossed the line, even mid-race", () => {
    expect(isRaceInputLocked("racing", true)).toBe(true);
    expect(isRaceInputLocked("racing", false)).toBe(false);
  });

  it("locks input while connecting (no snapshot yet)", () => {
    // The connecting window is the gap that let a spammer accumulate
    // local progress before the first snapshot arrived — it must lock.
    expect(isRaceInputLocked(null)).toBe(true);
    expect(isRaceInputLocked(undefined)).toBe(true);
  });
});

describe("live race-input lock store", () => {
  it("defaults to unlocked", () => {
    expect(isRaceInputCurrentlyLocked()).toBe(false);
  });

  it("reflects the last value set", () => {
    setRaceInputLocked(true);
    expect(isRaceInputCurrentlyLocked()).toBe(true);
    setRaceInputLocked(false);
    expect(isRaceInputCurrentlyLocked()).toBe(false);
  });

  it("drives the lock straight from the phase predicate across a full race", () => {
    // Mirrors the race provider's effect: lock follows the phase.
    for (const phase of ["matching", "lobby", "countdown"] as const) {
      setRaceInputLocked(isRaceInputLocked(phase));
      expect(isRaceInputCurrentlyLocked()).toBe(true);
    }
    // Gun fires → input flows.
    setRaceInputLocked(isRaceInputLocked("racing"));
    expect(isRaceInputCurrentlyLocked()).toBe(false);
    // Finished → locked again so no post-race typing leaks in (#11).
    setRaceInputLocked(isRaceInputLocked("finished"));
    expect(isRaceInputCurrentlyLocked()).toBe(true);
  });

  it("is released on unmount (provider resets to false)", () => {
    setRaceInputLocked(true);
    // The race provider's unmount cleanup calls setRaceInputLocked(false).
    setRaceInputLocked(false);
    expect(isRaceInputCurrentlyLocked()).toBe(false);
  });
});
