import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));
/** Lets a case make the engine throw once; otherwise the real engine runs. */
const engine = vi.hoisted(() => ({ throwNext: false }));
vi.mock("@/lib/typing-analysis/analyse", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/typing-analysis/analyse")>();
  return {
    ...real,
    analyseRun: (input: Parameters<typeof real.analyseRun>[0]) => {
      if (engine.throwNext) {
        engine.throwNext = false;
        throw new Error("engine broke");
      }
      return real.analyseRun(input);
    },
  };
});

import { sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import { runBucketKey } from "@/lib/test-bucket";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import { submitToRunInput } from "@/lib/typing-analysis/from-submit";
import { asV1, steady } from "@/lib/typing-analysis/run-script";
import { logger, type LogContext, type Logger } from "@/server/logger";
import { callRoute } from "@/server/testing";
import { submitTestInputSchema, type SubmitTestOutput } from "@/types/adapt";
import type { RunInput, TestDigestV1 } from "@/types/typing-analysis";

const T0 = 1_790_000_000_000;
const OWN_DB_TIMEOUT_MS = 30_000;
/** No word here is also a digest key or enum value, so the privacy check
 *  below can't pass or fail by coincidence. */
const WORDS = [
  "quick", "brown", "jumps", "over", "lazy", "dogs", "while", "seven", "people", "watch",
  "from", "their", "small", "house", "near", "river", "every", "morning", "before", "work",
  "starts", "again", "today", "under", "green",
];

function signedInAs(userId: string) {
  vi.mocked(auth).mockResolvedValue({ userId, sessionClaims: {} } as unknown as Awaited<ReturnType<typeof auth>>);
}

/** The wire payload for a fixture-DSL run (copied, not imported, from the
 *  other adapt tests' payload builder). */
function payloadFrom(run: RunInput, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    startedAt: T0, completedAt: T0 + run.durationMs, mode: "casual", durationOrWordCount: WORDS.length,
    lengthMode: run.lengthMode, wpm: run.wpm, accuracy: 100, errorCount: 0, resetCount: 0, wasCompleted: true,
    words: [...run.words], timings: [...run.timings],
    ...(run.edits ? { edits: [...run.edits] } : {}),
    ...(run.spaces ? { spaces: [...run.spaces] } : {}),
    ...(run.ctx ? { ctx: { ...run.ctx } } : {}),
    ...over,
  };
}
const v2 = (over: Record<string, unknown> = {}) => payloadFrom(steady(WORDS), { ctx: { codeMatch: 1 }, ...over });

/** The first in-word pair seen at least twice that the digest's "8 most
 *  frequent" rule wouldn't pick (same order: count, then key). */
function trackedOnlyPair(words: readonly string[]): string {
  const n = new Map<string, number>();
  for (const w of words) for (let i = 1; i < w.length; i++) n.set(w.slice(i - 1, i + 1), (n.get(w.slice(i - 1, i + 1)) ?? 0) + 1);
  const ranked = [...n].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  return ranked.slice(8).find(([, c]) => c >= 2)![0];
}

/** Every string value in a digest (keys excluded). */
function strings(x: unknown): string[] {
  if (typeof x === "string") return [x];
  if (Array.isArray(x)) return x.flatMap(strings);
  if (x && typeof x === "object") return Object.values(x).flatMap(strings);
  return [];
}

describe("adapt.submit stores a test analysis", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;
  const submit = (input: unknown, db = ctx.db) => callRoute<SubmitTestOutput>(["adapt", "submit"], { db, input });
  const digests = async (userId = "u1") => ctx.db.testAnalyses.listForUser(userId, { limit: 10 });

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    engine.throwNext = false;
    vi.mocked(auth).mockReset();
    signedInAs("u1");
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("stores one digest whose slices sum to the test and whose bucket is the run's", async () => {
    const input = v2();
    const out = await submit(input);
    const rows = await digests();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.testId).toBe(out.testId);
    const d = rows[0]!.digest as TestDigestV1;
    expect(d.sl.reduce((s, x) => s + x, 0)).toBe((input.completedAt as number) - T0);
    expect(rows[0]!.bucket).toBe(runBucketKey({ mode: "casual", lengthMode: "words", length: WORDS.length }, false));
    expect(rows[0]!.startedAt).toEqual(new Date(T0));
  });

  it("stores the same slices the browser computes from the same payload (I2, server half)", async () => {
    const input = v2();
    await submit(input);
    const parsed = submitTestInputSchema.parse(input);
    const expected = analyseRun(submitToRunInput(parsed)!)!.slices!;
    const d = (await digests())[0]!.digest as TestDigestV1;
    expect(d.sl).toEqual([expected.typing, expected.fixing, expected.before, expected.inside, expected.breaks]);
  });

  it("stores nothing for a v1 payload and still returns the test", async () => {
    const out = await submit(payloadFrom(asV1(steady(WORDS))));
    expect(out.testId).toBeTruthy();
    expect(await digests()).toEqual([]);
    expect(await ctx.db.tests.findById(out.testId)).not.toBeNull();
  });

  it("a corrupt edits element drops the array: 200, no digest, the test row exists (I3)", async () => {
    const out = await submit(v2({ edits: [{ t: -5, kind: "back" }] }));
    expect(out.testId).toBeTruthy();
    expect(await digests()).toEqual([]);
    expect(await ctx.db.tests.findById(out.testId)).not.toBeNull();
  });

  it("a ctx with unknown enum values and keys returns 200 and still stores the run (I3)", async () => {
    const out = await submit(v2({ ctx: { codeMatch: 1, confidence: "sometimes", input: "trackpad", layout: "dvorak" } }));
    expect(out.testId).toBeTruthy();
    const rows = await digests();
    expect(rows).toHaveLength(1);
    expect((rows[0]!.digest as TestDigestV1).ctx.input).toBe("keyboard");
  });

  it("stores nothing for sudden death or a capped run", async () => {
    const sd = await submit(v2({ ctx: { suddenDeath: true } }));
    const capped = await submit(v2({ ctx: { capped: true } }));
    expect(sd.testId).toBeTruthy();
    expect(capped.testId).toBeTruthy();
    expect(await digests()).toEqual([]);
    expect(await ctx.db.tests.recentForUser("u1", 10)).toHaveLength(2);
  });

  it("returns 200 with the test row when test_analyses is missing, and warns once (I5)", async () => {
    const own = await createTestDatabase();
    const calls: { msg: string; meta?: LogContext }[] = [];
    const quiet: Logger = {
      debug: () => {},
      info: () => {},
      warn: (msg, meta) => void calls.push({ msg, meta }),
      error: () => {},
      child: () => quiet,
    };
    const child = vi.spyOn(logger, "child").mockReturnValue(quiet);
    try {
      await own.db.$drizzle.execute(sql.raw("DROP TABLE test_analyses"));
      const out = await submit(v2(), own.db);
      expect(out.testId).toBeTruthy();
      expect(await own.db.tests.findById(out.testId)).not.toBeNull();
      expect(calls).toEqual([
        { msg: "test analysis not stored", meta: { userId: "u1", testId: out.testId, reason: "table-missing" } },
      ]);
    } finally {
      child.mockRestore();
      await own.close();
    }
  }, OWN_DB_TIMEOUT_MS);

  it("returns 200 with the test row when the engine throws (I5)", async () => {
    engine.throwNext = true;
    const out = await submit(v2());
    expect(out.testId).toBeTruthy();
    expect(await ctx.db.tests.findById(out.testId)).not.toBeNull();
    expect(await digests()).toEqual([]);
  });

  it("a cold model stores diff null; a warm one stores a number and tracks the weakest pairs", async () => {
    await submit(v2());
    expect(((await digests())[0]!.digest as TestDigestV1).diff).toBeNull();

    signedInAs("u2");
    const LETTERS = "abcdefghijklmnopqrstuvwxyz";
    const warm = new Map<string, { meanMs: number; varianceMs: number; sampleCount: number }>();
    for (const a of LETTERS) for (const b of LETTERS) warm.set(a + b, { meanMs: 110, varianceMs: 400, sampleCount: 1 });
    // A weak pair the passage types twice that isn't among its 8 most
    // frequent, so only tracking can put it in the digest.
    const weak = trackedOnlyPair(WORDS);
    // Few samples, so it barely moves the user's overall pair time (the
    // denominator of diff) and the passage reads as harder than average.
    warm.set(weak, { meanMs: 420, varianceMs: 400, sampleCount: 3 });
    await ctx.db.bigramModels.bulkUpsert("u2", warm);
    await submit(v2());
    const d = (await digests("u2"))[0]!.digest as TestDigestV1;
    expect(typeof d.diff).toBe("number");
    expect(d.diff!).toBeGreaterThan(1);
    expect(d.pairs.map((p) => p[0])).toContain(weak);
  });

  it("the digest holds no passage word (privacy)", async () => {
    await submit(v2({ ctx: { codeMatch: 1, wordlist: "english" } }));
    const d = (await digests())[0]!.digest as TestDigestV1;
    const found = strings(d);
    for (const w of WORDS) expect(found).not.toContain(w);
    const allowed = new Set(["english", "qwerty", "plain", "keyboard", "touch", "mixed", "fix", "block", "none", "g", "r"]);
    expect(found.filter((s) => s.length > 2 && !allowed.has(s))).toEqual([]);
  });

  it("plausibility verdicts are unchanged with v2 fields present", async () => {
    const run = steady(WORDS);
    const v2Fields = { edits: [...run.edits!], spaces: [...run.spaces!], ctx: { codeMatch: 1 } };
    // Claimed wpm far above what the keystrokes support: rejected, nothing written.
    await expect(submit(v2({ wpm: 400 }))).rejects.toMatchObject({ code: "VALIDATION" });
    // A sub-second completed run: rejected.
    await expect(submit(v2({ completedAt: T0 + 100, wpm: 300 }))).rejects.toMatchObject({ code: "VALIDATION" });
    // Empty keystrokes for a fast claim: rejected.
    await expect(submit({ ...v2(), ...v2Fields, wpm: 200, timings: [] })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
    expect(await digests()).toEqual([]);
    // The honest run is accepted, and so is a slow sparse one below the verify floor.
    expect((await submit(v2())).testId).toBeTruthy();
    const slow = await submit({ ...v2(), wpm: 30, words: [], timings: [], startedAt: T0 + 120_000, completedAt: T0 + 180_000 });
    expect(slow.testId).toBeTruthy();
  });

  it("a Dvorak-like run stores layout plain and no finger cells; a QWERTY one keeps them", async () => {
    await submit(v2({ ctx: { codeMatch: 0.4 } }));
    const dvorak = (await digests())[0]!.digest as TestDigestV1;
    expect(dvorak.ctx.layout).toBe("plain");
    expect(dvorak.fin).toBeNull();

    signedInAs("u2");
    await submit(v2({ ctx: { codeMatch: 0.98 } }));
    const qwerty = (await digests("u2"))[0]!.digest as TestDigestV1;
    expect(qwerty.ctx.layout).toBe("qwerty");
    expect(qwerty.fin).not.toBeNull();
  });
});
