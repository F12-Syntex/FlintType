import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { fingerMapHash } from "./key-map";

describe("fingerMapHash", () => {
  it("differs when enabled changes", () => {
    const a = fingerMapHash(DEFAULT_HAND_LAYOUT);
    const b = fingerMapHash({
      fingers: {
        ...DEFAULT_HAND_LAYOUT.fingers,
        L5: { enabled: false, homeKey: "KeyA" },
      },
    });
    expect(a).not.toBe(b);
  });

  it("differs when homeKey changes", () => {
    const a = fingerMapHash(DEFAULT_HAND_LAYOUT);
    const b = fingerMapHash({
      fingers: {
        ...DEFAULT_HAND_LAYOUT.fingers,
        L2: { enabled: true, homeKey: "KeyG" },
      },
    });
    expect(a).not.toBe(b);
  });

  it("is stable when the layout is unchanged", () => {
    expect(fingerMapHash(DEFAULT_HAND_LAYOUT)).toBe(
      fingerMapHash(DEFAULT_HAND_LAYOUT),
    );
  });

  it("tolerates a malformed layout", () => {
    expect(() =>
      // @ts-expect-error — intentionally malformed
      fingerMapHash({}),
    ).not.toThrow();
    // @ts-expect-error — intentionally malformed
    expect(fingerMapHash({})).toBe("default");
  });
});
