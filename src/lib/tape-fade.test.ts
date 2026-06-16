import { describe, expect, it } from "vitest";
import { tapeFadeMask } from "./tape-fade";

describe("tapeFadeMask", () => {
  it("returns null when fade is off", () => {
    expect(tapeFadeMask("off", 25)).toBeNull();
  });

  it("uses a 9% edge band for soft", () => {
    // margin 25 > edge 9 → left fade is the full 9% band, right edge 91%.
    expect(tapeFadeMask("soft", 25)).toBe(
      "linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%)",
    );
  });

  it("uses a 20% edge band for strong", () => {
    expect(tapeFadeMask("strong", 35)).toBe(
      "linear-gradient(to right, transparent 0%, #000 20%, #000 80%, transparent 100%)",
    );
  });

  it("clamps the left fade to the caret margin so the caret stays crisp", () => {
    // margin 5 < strong edge 20 → left fade stops at the margin (5%), not
    // 20%, so the caret pinned at 5% sits on the opaque boundary rather
    // than inside the fade.
    expect(tapeFadeMask("strong", 5)).toBe(
      "linear-gradient(to right, transparent 0%, #000 5%, #000 80%, transparent 100%)",
    );
  });

  it("clamps the margin into [0,100]", () => {
    expect(tapeFadeMask("soft", -10)).toContain("#000 0%");
    // margin 200 → clamped 100, left fade = min(100, 9) = 9; right band
    // pushed to 100 so the caret at the right edge stays opaque (FT-071).
    expect(tapeFadeMask("soft", 200)).toBe(
      "linear-gradient(to right, transparent 0%, #000 9%, #000 100%, transparent 100%)",
    );
  });

  it("pushes the right fade past the caret at high margins (FT-071)", () => {
    // strong edge 20 → default right band starts at 80%. A caret at 90%
    // would sit inside the right transparency ramp; the clamp moves the
    // band start to margin+buffer (95%) so the caret + a few upcoming
    // chars stay opaque.
    expect(tapeFadeMask("strong", 90)).toBe(
      "linear-gradient(to right, transparent 0%, #000 20%, #000 95%, transparent 100%)",
    );
    // At margin 100 the right band is capped at 100% (caret never faded).
    expect(tapeFadeMask("strong", 100)).toBe(
      "linear-gradient(to right, transparent 0%, #000 20%, #000 100%, transparent 100%)",
    );
  });

  it("leaves the right fade untouched at low/medium margins", () => {
    // margin 35 + buffer 5 = 40 < 80, so the right band stays at 80%.
    expect(tapeFadeMask("strong", 35)).toBe(
      "linear-gradient(to right, transparent 0%, #000 20%, #000 80%, transparent 100%)",
    );
  });
});
