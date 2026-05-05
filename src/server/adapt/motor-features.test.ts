import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { deriveFeatureKeys } from "./motor-features";

describe("motor-features", () => {
  it("emits same_finger when both chars share a finger", () => {
    // 'a' and 'q' both belong to L5 in the default layout.
    const keys = deriveFeatureKeys("a", "q", DEFAULT_HAND_LAYOUT);
    expect(keys).toContain("same_finger_L5");
  });

  it("emits row_jump_same_finger when same-finger crosses a row", () => {
    // 'a' (home) and 'q' (top) — same finger, different rows.
    const keys = deriveFeatureKeys("a", "q", DEFAULT_HAND_LAYOUT);
    expect(keys).toContain("row_jump_same_finger_L5");
    expect(keys).toContain("row_home_to_top");
  });

  it("emits same_hand_roll for adjacent same-hand fingers", () => {
    // 'a' (L5) and 'd' (L3) — both left hand, different fingers.
    const keys = deriveFeatureKeys("a", "d", DEFAULT_HAND_LAYOUT);
    expect(keys).toContain("same_hand_roll_L3_to_L5");
  });

  it("orders same-hand pairs deterministically", () => {
    // Either direction should produce the same ordered pair string.
    const ad = deriveFeatureKeys("a", "d", DEFAULT_HAND_LAYOUT);
    const da = deriveFeatureKeys("d", "a", DEFAULT_HAND_LAYOUT);
    const sameHandKeyAD = ad.find((k) => k.startsWith("same_hand_roll_"));
    const sameHandKeyDA = da.find((k) => k.startsWith("same_hand_roll_"));
    expect(sameHandKeyAD).toBe(sameHandKeyDA);
  });

  it("emits cross_hand for an inter-hand transition", () => {
    // 'a' (L5) → 'j' (R2)
    const keys = deriveFeatureKeys("a", "j", DEFAULT_HAND_LAYOUT);
    expect(keys.some((k) => k.startsWith("cross_hand_"))).toBe(true);
  });

  it("emits row transition independent of finger features", () => {
    // 'f' (home, L2) → 'e' (top, L3)
    const keys = deriveFeatureKeys("f", "e", DEFAULT_HAND_LAYOUT);
    expect(keys).toContain("row_home_to_top");
  });

  it("returns [] when a character is unmapped", () => {
    expect(deriveFeatureKeys("a", "1", DEFAULT_HAND_LAYOUT)).toEqual([]);
    expect(deriveFeatureKeys("@", "b", DEFAULT_HAND_LAYOUT)).toEqual([]);
  });

  it("returns [] when either finger is disabled", () => {
    const layout = {
      fingers: {
        ...DEFAULT_HAND_LAYOUT.fingers,
        L5: { enabled: false, homeKey: "KeyA" },
      },
    };
    // 'a' lives on L5 → disabled.
    expect(deriveFeatureKeys("a", "j", layout)).toEqual([]);
    expect(deriveFeatureKeys("j", "a", layout)).toEqual([]);
  });

  it("does not emit a row feature when chars share a row", () => {
    // 'a' (home) and 'f' (home).
    const keys = deriveFeatureKeys("a", "f", DEFAULT_HAND_LAYOUT);
    expect(keys.some((k) => k.startsWith("row_"))).toBe(false);
  });
});
