import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import {
  disabledFingers,
  fingerForChar,
  fingerMapHash,
  handOf,
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

  it("handOf reads the prefix of a finger id", () => {
    expect(handOf("L5")).toBe("L");
    expect(handOf("R2")).toBe("R");
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

  it("fingerMapHash differs when enabled changes", () => {
    const a = fingerMapHash(DEFAULT_HAND_LAYOUT);
    const b = fingerMapHash({
      fingers: {
        ...DEFAULT_HAND_LAYOUT.fingers,
        L5: { enabled: false, homeKey: "KeyA" },
      },
    });
    expect(a).not.toBe(b);
  });

  it("fingerMapHash differs when homeKey changes", () => {
    const a = fingerMapHash(DEFAULT_HAND_LAYOUT);
    const b = fingerMapHash({
      fingers: {
        ...DEFAULT_HAND_LAYOUT.fingers,
        L2: { enabled: true, homeKey: "KeyG" },
      },
    });
    expect(a).not.toBe(b);
  });

  it("fingerMapHash is stable when the layout is unchanged", () => {
    expect(fingerMapHash(DEFAULT_HAND_LAYOUT)).toBe(
      fingerMapHash(DEFAULT_HAND_LAYOUT),
    );
  });
});
