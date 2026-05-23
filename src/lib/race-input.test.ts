import { describe, expect, it } from "vitest";
import { isRaceInputLocked } from "./race-input";

describe("isRaceInputLocked", () => {
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
