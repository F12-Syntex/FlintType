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
  it("locks input during the pre-race phases", () => {
    expect(isRaceInputLocked("matching")).toBe(true);
    expect(isRaceInputLocked("lobby")).toBe(true);
    expect(isRaceInputLocked("countdown")).toBe(true);
  });

  it("allows input once the race is running or finished", () => {
    expect(isRaceInputLocked("racing")).toBe(false);
    expect(isRaceInputLocked("finished")).toBe(false);
  });

  it("does not lock when there is no snapshot yet", () => {
    expect(isRaceInputLocked(null)).toBe(false);
    expect(isRaceInputLocked(undefined)).toBe(false);
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
    // Finished → still open (the user may have crossed the line).
    setRaceInputLocked(isRaceInputLocked("finished"));
    expect(isRaceInputCurrentlyLocked()).toBe(false);
  });

  it("is released on unmount (provider resets to false)", () => {
    setRaceInputLocked(true);
    // The race provider's unmount cleanup calls setRaceInputLocked(false).
    setRaceInputLocked(false);
    expect(isRaceInputCurrentlyLocked()).toBe(false);
  });
});
