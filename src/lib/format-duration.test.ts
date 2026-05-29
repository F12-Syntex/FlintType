import { describe, expect, it } from "vitest";
import { formatClock } from "./format-duration";

describe("formatClock", () => {
  it("formats m:ss with zero-padded seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(24)).toBe("0:24");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
  });

  it("leaves the minute field unbounded", () => {
    expect(formatClock(83 * 60 + 20)).toBe("83:20");
  });

  it("floors fractional seconds and clamps negatives", () => {
    expect(formatClock(5.9)).toBe("0:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});
