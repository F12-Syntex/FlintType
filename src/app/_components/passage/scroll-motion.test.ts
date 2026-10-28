import { describe, expect, it } from "vitest";
import { passageScrollMotion } from "./scroll-motion";

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

describe("passageScrollMotion", () => {
  it("animates only while a run is in progress with smooth scroll on", () => {
    const base = { tapeOn: false, tapeMode: "off" as const };
    expect(passageScrollMotion({ ...base, smoothLineScroll: true, running: true }).animateScroll).toBe(true);
    expect(passageScrollMotion({ ...base, smoothLineScroll: true, running: false }).animateScroll).toBe(false);
    expect(passageScrollMotion({ ...base, smoothLineScroll: false, running: true }).animateScroll).toBe(false);
  });

  it("multi-line scroll glides 220ms with an ease-out", () => {
    const m = passageScrollMotion({ smoothLineScroll: true, running: true, tapeOn: false, tapeMode: "off" });
    expect(m.scrollDurationMs).toBe(220);
    expect(m.scrollEase).toBe(EASE_OUT);
  });

  it("letter tape glides 190ms linear, word tape 240ms linear", () => {
    const letter = passageScrollMotion({ smoothLineScroll: true, running: true, tapeOn: true, tapeMode: "letter" });
    expect(letter).toEqual({ animateScroll: true, scrollDurationMs: 190, scrollEase: "linear" });
    const word = passageScrollMotion({ smoothLineScroll: true, running: true, tapeOn: true, tapeMode: "word" });
    expect(word).toEqual({ animateScroll: true, scrollDurationMs: 240, scrollEase: "linear" });
  });
});
