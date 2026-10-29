import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT, type FingerId } from "@/lib/hand-layout";
import {
  STD_KEY_FINGER,
  STD_KEY_ROW,
  disabledFingers,
  fingerForChar,
  handOf,
  keysForFinger,
  rowForChar,
} from "./key-map";

describe("key-map", () => {
  it("fingerForChar maps standard QWERTY letters", () => {
    expect(fingerForChar("a")).toBe("L5");
    expect(fingerForChar("f")).toBe("L2");
    expect(fingerForChar("j")).toBe("R2");
    expect(fingerForChar(";")).toBe("R5");
    expect(fingerForChar(" ")).toBe("L1");
  });

  it("fingerForChar is case-insensitive", () => {
    expect(fingerForChar("A")).toBe("L5");
    expect(fingerForChar("F")).toBe("L2");
  });

  it("fingerForChar returns null for unmapped characters", () => {
    expect(fingerForChar("1")).toBeNull();
    expect(fingerForChar("@")).toBeNull();
    expect(fingerForChar("")).toBeNull();
  });

  it("rowForChar covers all 26 letters", () => {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    for (const ch of letters) {
      expect(rowForChar(ch)).not.toBeNull();
    }
  });

  it("exports the finger and row maps", () => {
    expect(STD_KEY_FINGER.q).toBe("L5");
    expect(STD_KEY_ROW.q).toBe("top");
    expect(STD_KEY_ROW[" "]).toBeUndefined();
  });

  it("handOf reads the prefix of a finger id", () => {
    expect(handOf("L5")).toBe("L");
    expect(handOf("R2")).toBe("R");
  });

  it("keysForFinger lists a finger's letters in alphabetical order", () => {
    expect(keysForFinger("L4")).toEqual(["s", "w", "x"]);
    expect(keysForFinger("L2")).toEqual(["b", "f", "g", "r", "t", "v"]);
    // Letters only: R4 also types "." and R5 types ";", "/" and "'".
    expect(keysForFinger("R4")).toEqual(["l", "o"]);
    expect(keysForFinger("R5")).toEqual(["p"]);
    // The thumbs type only the space bar.
    expect(keysForFinger("L1")).toEqual([]);
    expect(keysForFinger("R1")).toEqual([]);
  });

  it("keysForFinger covers every letter exactly once", () => {
    const fingers: FingerId[] = ["L5", "L4", "L3", "L2", "L1", "R1", "R2", "R3", "R4", "R5"];
    const all = fingers.flatMap((f) => keysForFinger(f)).sort();
    expect(all.join("")).toBe("abcdefghijklmnopqrstuvwxyz");
  });

  it("disabledFingers extracts the set of disabled ids", () => {
    const layout = {
      fingers: {
        ...DEFAULT_HAND_LAYOUT.fingers,
        L5: { enabled: false, homeKey: "KeyA" },
        R5: { enabled: false, homeKey: "Semicolon" },
      },
    };
    const got = disabledFingers(layout);
    expect(got.has("L5")).toBe(true);
    expect(got.has("R5")).toBe(true);
    expect(got.has("L2")).toBe(false);
    expect(got.size).toBe(2);
  });

  it("disabledFingers is empty for the default layout", () => {
    expect(disabledFingers(DEFAULT_HAND_LAYOUT).size).toBe(0);
  });

  // Regression — older / hand-edited prefs blobs may store the
  // handLayout without a `fingers` map. The whole adapt.words path
  // chains into `disabledFingers` and used to throw `Cannot convert
  // undefined or null to object` on `Object.entries(layout.fingers)`.
  it("disabledFingers tolerates a layout missing fingers map", () => {
    expect(() =>
      // @ts-expect-error — intentionally malformed
      disabledFingers({}),
    ).not.toThrow();
    // @ts-expect-error — intentionally malformed
    expect(disabledFingers({}).size).toBe(0);
    // @ts-expect-error — intentionally malformed
    expect(disabledFingers({ fingers: null }).size).toBe(0);
  });
});
