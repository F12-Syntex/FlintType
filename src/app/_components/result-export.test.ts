import { describe, expect, it } from "vitest";
import { exportHeight } from "./result-export";

const kid = (height: number, exportable = true) => ({ height, exportable });

describe("exportHeight", () => {
  it("all exportable: the children and their gaps, plus 4 px for shadows", () => {
    expect(exportHeight([kid(300), kid(100), kid(120)], 24, 2000)).toBe(300 + 100 + 120 + 2 * 24 + 4);
  });
  it("matches the old bottom-of-last-child crop when nothing is filtered between", () => {
    // Old crop: bottom of the last exportable child = Σ heights + gaps.
    const kids = [kid(312.4), kid(96.2)];
    expect(exportHeight(kids, 24, 5000)).toBe(Math.ceil(312.4 + 24 + 96.2) + 4);
  });
  it("a no-export child in the middle leaves no band", () => {
    expect(exportHeight([kid(300), kid(56, false), kid(400, false), kid(120)], 24, 2000)).toBe(300 + 120 + 24 + 4);
  });
  it("a no-export child last is simply left off", () => {
    expect(exportHeight([kid(300), kid(100), kid(56, false)], 24, 2000)).toBe(300 + 100 + 24 + 4);
  });
  it("none exportable falls back to the scroll height", () => {
    expect(exportHeight([kid(300, false)], 24, 777)).toBe(777);
    expect(exportHeight([], 24, 777)).toBe(777);
  });
  it("never exceeds the node's scroll height", () => {
    expect(exportHeight([kid(500), kid(500)], 24, 900)).toBe(900);
  });
});
