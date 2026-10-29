import { describe, expect, it } from "vitest";
import type { Finding } from "@/types/typing-analysis";
import { practiseLinkFor } from "./practise-link";

const ALL: Finding[] = [
  { kind: "fixing", impactMs: 1, ms: 1, count: 2, worstWord: null, noticedLate: null },
  { kind: "left", impactMs: 1, count: 1, lostWpm: 2, canFix: true },
  { kind: "before", impactMs: 1, ms: 1, count: 2, longest: null, longWords: false },
  { kind: "inside", impactMs: 1, ms: 1, count: 2, topWord: null },
  { kind: "breaks", impactMs: 1, ms: 1, count: 1 },
  { kind: "fade", impactMs: 1, fromWpm: 80, toWpm: 70, lastSeconds: 10 },
  { kind: "startUp", impactMs: 1, words: 4, ms: 1 },
  { kind: "even", impactMs: 0, mistakes: 0 },
  { kind: "short", impactMs: 0 },
  { kind: "clock", impactMs: 0 },
];
const of = (kind: Finding["kind"]) => ALL.find((f) => f.kind === kind)!;

describe("practiseLinkFor", () => {
  it("maps each friction finding to an always-open drill", () => {
    expect(practiseLinkFor(of("fixing"), true)).toEqual({ drillId: "tricky", title: "Tongue-twister gauntlet" });
    expect(practiseLinkFor(of("left"), true)).toEqual({ drillId: "tricky", title: "Tongue-twister gauntlet" });
    expect(practiseLinkFor(of("before"), true)).toEqual({ drillId: "top-100-sprint", title: "Top 100 sprint" });
    expect(practiseLinkFor(of("inside"), true)).toEqual({ drillId: "english-burst", title: "English burst" });
  });
  it("gives nothing for the other kinds, for no finding, or when signed out", () => {
    for (const k of ["breaks", "fade", "startUp", "even", "short", "clock"] as const) expect(practiseLinkFor(of(k), true)).toBeNull();
    expect(practiseLinkFor(undefined, true)).toBeNull();
    for (const f of ALL) expect(practiseLinkFor(f, false)).toBeNull();
  });
  it("never links a drill that can be locked", () => {
    for (const f of ALL) {
      const id = practiseLinkFor(f, true)?.drillId ?? "";
      expect(["weakness", "worst-words", "trigram-burst"]).not.toContain(id);
      expect(id.startsWith("isolation-")).toBe(false);
    }
  });
});
