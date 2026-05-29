import { describe, expect, it } from "vitest";
import type { SubmitTestInput } from "@/types/adapt";
import { formatPbBody } from "./submit";

function input(over: Partial<SubmitTestInput> = {}): SubmitTestInput {
  return {
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_010_000,
    mode: "casual",
    durationOrWordCount: 30,
    wpm: 100,
    accuracy: 100,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    words: ["the", "and"],
    timings: [],
    ...over,
  };
}

describe("formatPbBody — personal-best notification line (#12)", () => {
  it("omits the delta when there's no previous best", () => {
    expect(formatPbBody(input({ wpm: 100 }), null)).not.toContain("previous best");
  });

  it("derives +delta from the ROUNDED figures so the math reconciles", () => {
    // 160.4 → 160 shown, 155.6 → 156 shown. The raw gap (4.8) rounds to
    // 5, but the displayed values only differ by 4 — the bug. The body
    // must read "160 wpm", "previous best 156", "+4" (not +5).
    const body = formatPbBody(input({ wpm: 160.4, accuracy: 87.7 }), 155.6);
    expect(body).toContain("160 wpm");
    expect(body).toContain("previous best 156");
    expect(body).toContain("· +4");
    expect(body).not.toContain("+5");
  });

  it("reconciles for any new/previous pair", () => {
    for (const [w, p] of [[160.4, 155.6], [99.5, 90.4], [203.9, 199.1]] as const) {
      const body = formatPbBody(input({ wpm: w }), p);
      const expected = Math.round(w) - Math.round(p);
      expect(body).toContain(`previous best ${Math.round(p)} · +${expected}`);
    }
  });
});
