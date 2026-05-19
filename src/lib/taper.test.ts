import { describe, expect, it } from "vitest";

import { taperStyle } from "./taper";

describe("taperStyle", () => {
  it("returns undefined when the mode is off", () => {
    expect(taperStyle(0, "off", "medium")).toBeUndefined();
    expect(taperStyle(5, "off", "strong")).toBeUndefined();
  });

  it("returns undefined for the active word (distance 0)", () => {
    expect(taperStyle(0, "opacity", "medium")).toBeUndefined();
    expect(taperStyle(0, "size", "medium")).toBeUndefined();
    expect(taperStyle(0, "blur", "medium")).toBeUndefined();
    expect(taperStyle(0, "mute", "medium")).toBeUndefined();
  });

  it("opacity fades as distance grows, then floors", () => {
    const d1 = taperStyle(1, "opacity", "medium");
    const d3 = taperStyle(3, "opacity", "medium");
    const d100 = taperStyle(100, "opacity", "medium");
    expect(d1?.opacity).toBeCloseTo(0.92, 2);
    expect(d3?.opacity).toBeCloseTo(0.76, 2);
    expect(d100?.opacity).toBe(0.4);
  });

  it("size shrinks as distance grows, then floors", () => {
    const d1 = taperStyle(1, "size", "strong");
    const d100 = taperStyle(100, "size", "strong");
    expect(d1?.fontSize).toBe("0.960em");
    expect(d100?.fontSize).toBe("0.750em");
  });

  it("blur grows with distance, capped at the ceiling", () => {
    const d1 = taperStyle(1, "blur", "soft");
    const d100 = taperStyle(100, "blur", "soft");
    expect(d1?.filter).toBe("blur(0.10px)");
    expect(d100?.filter).toBe("blur(0.60px)");
  });

  it("mute blends toward muted-foreground", () => {
    const d2 = taperStyle(2, "mute", "medium");
    expect(d2?.color).toMatch(/color-mix.*muted-foreground.*16%.*currentColor/);
  });

  it("clamps negative / fractional distance to 0 / floored", () => {
    expect(taperStyle(-3, "opacity", "medium")).toBeUndefined();
    expect(taperStyle(1.9, "opacity", "medium")).toEqual(
      taperStyle(1, "opacity", "medium"),
    );
  });
});
