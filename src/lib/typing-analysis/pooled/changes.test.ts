import { describe, expect, it } from "vitest";
import type { TestSummaryRow } from "@/types/insights";
import type { TestDigestV1 } from "@/types/typing-analysis";
import { analyseRun } from "../analyse";
import { digestContext } from "../context";
import { buildDigest } from "../digest";
import { POOL, seeded } from "../run-script-core";
import { steady, withMistake, withPause } from "../run-script";
import { changeCandidates, changesSection, orderChanges, pairCandidates, type Candidate } from "./changes";
import { buildPooled, FIXTURE_T0, type FixtureOptions } from "./digest-fixtures";
import { difficultyAdjustment } from "./difficulty";
import { sPerMin } from "./minute";
import { dg, fixKeyOf, toPooled, windowsFor, type AnalysisIndex, type PooledTest } from "./windows";

const w = (ts: PooledTest[]) => windowsFor(ts, ts[0]!.bucket);
const cands = (ts: PooledTest[]) => {
  const win = w(ts);
  return changeCandidates(win, difficultyAdjustment(win), fixKeyOf(win), true);
};
const of = (o: FixtureOptions) => cands(buildPooled(o));
const share = (o: FixtureOptions, pick: (c: Candidate[]) => boolean, seeds: number) => {
  let k = 0;
  for (let s = 1; s <= seeds; s++) if (pick(of({ ...o, seed: s }))) k++;
  return k / seeds;
};

/** A stationary typist built from real engine output: runs rendered by the
 *  fixture DSL, analysed by analyseRun and stored by buildDigest. */
function engineUser(seed: number, tests = 40): PooledTest[] {
  const u = seeded(seed * 131 + 7);
  const n = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const pool = POOL.filter((x) => /^[a-z]+$/.test(x));
  const K = 90 + 110 * u();
  const rows: TestSummaryRow[] = [];
  const digests = new Map<string, TestDigestV1>();
  const index: AnalysisIndex = new Map();
  let day = 0;
  let k = 0;
  let dayFx = 0;
  while (rows.length < tests) {
    dayFx = 0.5 * dayFx + 0.03 * n();
    for (let s = 0, sessions = 1 + Math.floor(u() * 3); s < sessions && rows.length < tests; s++) {
      const sessFx = 0.03 * n();
      for (let j = 0, size = 1 + Math.floor(u() * 6); j < size && rows.length < tests; j++) {
        const key = K * Math.exp(dayFx + sessFx + 0.05 * n());
        const words = Array.from({ length: 25 }, () => pool[Math.floor(u() * pool.length)]!);
        let r = steady(words, { key, gap: key * (2.1 + 0.3 * u()) });
        for (let wi = 1; wi < 25; wi++) if (u() < 0.04) r = withPause(r, { beforeWord: wi, ms: key * (3 + 7 * u()) });
        for (let wi = 1; wi < 25; wi++) if (u() < 0.03 && words[wi]!.length > 2) r = withPause(r, { insideWord: [wi, 0], ms: key * (2 + 4 * u()) });
        for (let wi = 0; wi < 25; wi++) if (u() < 0.04) r = withMistake(r, { word: wi, pos: Math.floor(u() * words[wi]!.length), noticeAfter: Math.floor(u() * 2) });
        const a = analyseRun(r)!;
        const id = `e${String(k++).padStart(4, "0")}`;
        const acc = Math.round((1000 * (a.counts.keys - a.mistakes.count)) / a.counts.keys) / 10;
        digests.set(id, buildDigest(a, { acc, wpm: r.wpm, trackedPairs: [], diff: null, ctx: digestContext(r.ctx, "keyboard", true, a.quality.qwerty) }));
        rows.push({ id, startedAt: new Date(FIXTURE_T0 + day * 86_400_000 + s * 5 * 3_600_000 + j * 180_000), mode: "casual",
          lengthMode: "words", durationOrWordCount: 25, wpm: r.wpm, accuracy: acc, errorCount: a.mistakes.count, wasCompleted: true });
        index.set(id, { bucket: "casual|words|25", diff: null });
      }
    }
    day++;
  }
  return toPooled(rows.reverse(), index, digests);
}

describe("noise gates (I12)", () => {
  it("fewer than 10% of 200 realistic stationary users show any change", () => {
    expect(share({ tests: 40 }, (c) => c.length > 0, 200)).toBeLessThan(0.1);
    expect(share({ tests: 60 }, (c) => c.length > 0, 200)).toBeLessThan(0.1);
  });
  it("the engine's own digests agree: zero-inflated friction, and few changes", () => {
    const users = Array.from({ length: 20 }, (_, i) => engineUser(i + 1));
    const all = users.flatMap((ts) => ts.map(dg));
    const zero = (x: "fixing" | "before" | "inside") => all.filter((d) => sPerMin(d, x) === 0).length / all.length;
    // Like the fixture (fixing 0 in ~35%, before ~40%, inside ~50%): many zeros, never all.
    for (const x of ["fixing", "before", "inside"] as const) {
      expect(zero(x)).toBeGreaterThan(0.1);
      expect(zero(x)).toBeLessThan(0.9);
    }
    expect(all.every((d) => d.se !== null)).toBe(true);
    // 20 users can't resolve a rate below 10% (2 is 10%, and 3 would be
    // likely even at a true 7%); the 200-user run above is the gate, this
    // checks the engine's output behaves the same way.
    const changed = users.filter((ts) => cands(ts).length > 0).length;
    expect(changed).toBeLessThanOrEqual(2);
  });
});

describe("detection", () => {
  it("a +6 wpm step is detected", () => {
    expect(share({ tests: 40, noiseSd: 2, recent: { wpm: 6 } }, (c) => c.some((x) => x.kind === "speed" && x.direction === "better"), 20)).toBeGreaterThanOrEqual(0.8);
  });
  it("fixing 2 s a minute lower is detected as better", () => {
    // 8 mistakes a minute at about 0.4 s each, then 2: about 3.2 to 0.8 s a
    // minute, in 60 s tests, one a day. The mistake rate has session and day
    // effects, so a 25-word test (about 3 mistakes) resolves it in only
    // about a third of users; 60 s tests are detected in about 60%.
    const o: FixtureOptions = { tests: 40, sessions: Array(40).fill(1), perDay: [1, 1], lengthMode: "time", length: 60,
      mistakesPerMin: 8, costMs: 400, recent: { mistakesPerMin: -6 } };
    const hit = (c: Candidate[]) => c.some((x) => x.kind === "fixing" && x.direction === "better" && x.before - x.after >= 1.5);
    expect(share(o, hit, 100)).toBeGreaterThanOrEqual(0.5);
  });
  it("a uniform 8% speed-up moves no pair", () => {
    expect(share({ tests: 40, recent: { paceScale: 0.92 } }, (c) => c.some((x) => x.kind === "pair"), 50)).toBeLessThan(0.1);
  });
  it("a pair 25% quicker relative to pace is detected", () => {
    const hit = (c: Candidate[]) => c.some((x) => x.kind === "pair" && x.key === "th" && x.direction === "better");
    expect(share({ tests: 40, recent: { pairScale: { th: 0.75 } } }, hit, 100)).toBeGreaterThanOrEqual(0.8);
    const one = buildPooled({ tests: 40, seed: 2, recent: { pairScale: { th: 0.75 } } });
    const c = pairCandidates(w(one)).find((x) => x.key === "th")!;
    expect(c.unit).toBe("ms");
    expect(c.after / c.before).toBeGreaterThan(0.65);
    expect(c.after / c.before).toBeLessThan(0.85);
  });
  it("over 6 tests a side, a pair 25% quicker passes; with 3 a side nothing is tested", () => {
    const base = buildPooled({ tests: 16, seed: 1 });
    const win = w(base);
    const earlier6 = new Set(win.earlierD.slice(0, 6).map((t) => t.id));
    const recent6 = new Set(win.recentD.slice(0, 6).map((t) => t.id));
    /** "th" seen 4 times, at exp(u) × the test's own pace, a little noise. */
    const withTh = (keepEarlier: Set<string>) => base.map((t, i) => {
      const d = dg(t);
      const pairs = d.pairs.filter((p) => p[0] !== "th");
      const u = recent6.has(t.id) ? Math.log(0.75) : keepEarlier.has(t.id) ? 0 : null;
      if (u !== null) {
        const m = Math.log(d.pace.P) + u + (i % 2 ? 0.03 : -0.03);
        pairs.push(["th", 4, 4 * m, 4 * m * m + 0.06]);
      }
      return { ...t, digest: { ...d, pairs } };
    });
    const six = withTh(earlier6);
    expect(pairCandidates(w(six)).find((x) => x.key === "th")).toMatchObject({ direction: "better" });
    const three = withTh(new Set([...earlier6].slice(0, 3)));
    expect(pairCandidates(w(three)).some((x) => x.key === "th")).toBe(false);
  });
});

describe("ordering", () => {
  const c = (kind: Candidate["kind"], direction: Candidate["direction"], z: number): Candidate =>
    ({ kind, direction, before: 1, after: 2, unit: "sPerMin", z, zNeeded: 2.5 });
  it("improvements first, each group by strength, at most 3", () => {
    const out = orderChanges([c("before", "worse", 9), c("inside", "better", 3), c("fixing", "better", -6), c("accuracy", "worse", 4)], "steady");
    expect(out.map((x) => x.kind)).toEqual(["fixing", "inside", "before"]);
    expect(out[0]).not.toHaveProperty("z");
  });
  it("at most 2 declines when there is an improvement, 3 when there isn't", () => {
    const worse = [c("before", "worse", 5), c("inside", "worse", 4), c("fixing", "worse", 3)];
    expect(orderChanges([...worse, c("accuracy", "better", 3)], "steady").filter((x) => x.direction === "worse")).toHaveLength(2);
    expect(orderChanges(worse, "steady")).toHaveLength(3);
  });
  it("drops speed when the trend already says it, and flow beside speed in the same direction", () => {
    const list = [c("speed", "better", 4), c("flow", "better", 3), c("flow", "worse", 3)];
    expect(orderChanges(list, "improving").map((x) => x.kind)).toEqual(["flow", "flow"]);
    expect(orderChanges(list, "steady").map((x) => `${x.kind}-${x.direction}`)).toEqual(["speed-better", "flow-worse"]);
  });
});

describe("changesSection", () => {
  it("is learning until 15 tests over 2 sessions", () => {
    const few = w(buildPooled({ tests: 12 }));
    expect(changesSection(few, [], "early")).toEqual({ status: "learning", gate: { have: 12, need: 15, unit: "tests" } });
    const one = w(buildPooled({ tests: 40, sessions: [...Array(30).fill(1), 10] }));
    expect(changesSection(one, [], "early")).toMatchObject({ status: "learning", gate: { unit: "sessions" } });
    expect(changeCandidates(one, difficultyAdjustment(one), "fix", true)).toEqual([]);
  });
  it("is ready with the earlier count", () => {
    expect(changesSection(w(buildPooled({ tests: 40 })), [], "steady")).toEqual({ status: "ready", items: [], earlierN: 30 });
  });
  it("without digests, only speed and accuracy are tested", () => {
    const ts = buildPooled({ tests: 40, noiseSd: 2, recent: { wpm: 8, pairScale: { th: 0.5 } } });
    const win = w(ts);
    const kinds = changeCandidates(win, difficultyAdjustment(win), "fix", false).map((x) => x.kind);
    expect(kinds).toContain("speed");
    expect(kinds).not.toContain("pair");
  });
});
