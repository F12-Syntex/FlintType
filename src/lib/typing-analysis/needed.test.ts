import { describe, expect, it } from "vitest";
import type { RunInput } from "@/types/typing-analysis";
import { neededCounter } from "./needed";
import { aliveIn, applyStep, newReplay, replayOrder, type ReplayState } from "./replay";
import { randomKeys } from "./run-keys";
import { randomScript } from "./run-script";
import { seeded } from "./run-script-core";
import { buildTimeline, type Timeline } from "./timeline";

/** The definition (spec-10 §6.2), scanned directly: the oracle. */
function naive(tl: Timeline, st: ReplayState, a: number, b: number): number {
  let alive = 0;
  for (let k = Math.max(0, a + 1); k <= Math.min(b, tl.K - 1); k++) if (st.alive[k]) alive++;
  let spaces = 0;
  for (let g = Math.max(0, a + 1); g <= Math.min(b, tl.K); g++) {
    for (const m of tl.marks[g]!) {
      if (m.kind === "space") spaces++;
      else if (m.e.cross === true && spaces > 0) spaces--;
    }
  }
  return alive + spaces;
}

/** Replays the run, asking both at random moments for random spans that end at or before the cursor. */
function agree(r: RunInput, seed: number): number {
  const tl = buildTimeline(r);
  if (tl.capture !== 2) return 0;
  const rng = seeded(seed);
  const st = newReplay(tl);
  const needed = neededCounter(tl, st);
  let checks = 0;
  for (const step of replayOrder(tl)) {
    applyStep(st, tl, step);
    if (step.kind !== "char" || rng() > 0.3) continue;
    for (let q = 0; q < 4; q++) {
      const b = rng() < 0.15 ? tl.K : Math.floor(rng() * (step.k + 1));
      const a = Math.floor(rng() * (b + 2)) - 1;
      expect(needed(a, b)).toBe(naive(tl, st, a, b));
      let alive = 0;
      for (let k = Math.max(0, a + 1); k <= Math.min(b, tl.K - 1); k++) alive += st.alive[k]!;
      expect(aliveIn(st, a + 1, b)).toBe(alive);
      checks++;
    }
  }
  return checks;
}

describe("neededCounter", () => {
  it("matches the direct scan on key-level random runs", () => {
    let checks = 0;
    for (let s = 0; s < 250; s++) checks += agree(randomKeys(s), s);
    expect(checks).toBeGreaterThan(2000);
  });

  it("matches on scripted runs and with cross flags scrambled", () => {
    let checks = 0;
    for (let s = 0; s < 150; s++) {
      const r = randomScript(s);
      checks += agree(r, s);
      const k = randomKeys(s + 1000);
      const rng = seeded(s + 7);
      const scrambled = { ...k, edits: k.edits?.map((e) => (rng() < 0.5 ? { ...e, cross: true as const } : { ...e, cross: undefined })) };
      checks += agree(scrambled, s + 1);
    }
    expect(checks).toBeGreaterThan(1000);
  });

  it("an empty span needs nothing; a final Space counts only when b = K", () => {
    const r = randomKeys(3);
    const tl = buildTimeline(r);
    const st = newReplay(tl);
    for (const step of replayOrder(tl)) applyStep(st, tl, step);
    const needed = neededCounter(tl, st);
    expect(needed(5, 5)).toBe(0);
    expect(needed(tl.K - 1, tl.K)).toBe(naive(tl, st, tl.K - 1, tl.K));
  });
});
