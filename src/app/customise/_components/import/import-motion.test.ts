import { describe, expect, it } from "vitest";
import { dropExit, enterMotion, IMPORT_MOTION_MS } from "./import-motion";

describe("import dialog motion", () => {
  it("uses the durations ui-law §13 gives", () => {
    expect(IMPORT_MOTION_MS).toEqual({ check: 150, detail: 200, screen: 200, drop: 150 });
    expect(enterMotion("check", false).transition.duration).toBe(0.15);
    expect(enterMotion("screen", false).transition.duration).toBe(0.2);
  });

  it("scales the check in from half size and drops the detail 4px", () => {
    expect(enterMotion("check", false)).toMatchObject({ initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 } });
    expect(enterMotion("detail", false)).toMatchObject({ initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } });
    // A screen only fades: no transform is left on it.
    expect(enterMotion("screen", false).animate).toEqual({ opacity: 1 });
  });

  it("doesn't move under reduced motion", () => {
    for (const piece of ["check", "detail", "screen", "drop"] as const) {
      expect(enterMotion(piece, true).initial).toBe(false);
    }
    expect(dropExit(true)).toBeUndefined();
    expect(dropExit(false)).toMatchObject({ opacity: 0 });
  });
});
