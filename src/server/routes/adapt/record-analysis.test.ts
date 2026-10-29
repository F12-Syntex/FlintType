import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import { createTestDatabase } from "@/db/server/testing";
import { DEFAULT_HAND_LAYOUT, type HandLayoutPrefs } from "@/lib/hand-layout";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import { digestContext } from "@/lib/typing-analysis/context";
import { buildDigest } from "@/lib/typing-analysis/digest";
import { asV1, steady, withMistake } from "@/lib/typing-analysis/run-script";
import type { LogContext, Logger } from "@/server/logger";
import { submitTestInputSchema, type SubmitTestInput } from "@/types/adapt";
import type { RunContext } from "@/types/capture";
import type { RunInput } from "@/types/typing-analysis";
import { recordTestAnalysis } from "./record-analysis";

const T0 = 1_790_000_000_000;
const OWN_DB_TIMEOUT_MS = 30_000;
const WORDS = [
  "quick", "brown", "jumps", "over", "lazy", "dogs", "while", "seven", "people", "watch",
  "from", "their", "small", "house", "near", "river", "every", "morning", "before", "work",
  "starts", "again", "today", "under", "green",
];

/** A RunInput from the fixture DSL as the parsed adapt.submit payload. */
function payloadFrom(run: RunInput, over: Partial<SubmitTestInput> = {}): SubmitTestInput {
  return submitTestInputSchema.parse({
    startedAt: T0,
    completedAt: T0 + run.durationMs,
    mode: "casual",
    durationOrWordCount: WORDS.length,
    lengthMode: run.lengthMode,
    wpm: run.wpm,
    accuracy: 100,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    words: [...run.words],
    timings: [...run.timings],
    ...(run.edits ? { edits: [...run.edits] } : {}),
    ...(run.spaces ? { spaces: [...run.spaces] } : {}),
    ...(run.ctx ? { ctx: { ...run.ctx } } : {}),
    ...over,
  });
}

const v2 = (ctx: RunContext = {}) => payloadFrom(steady(WORDS), { ctx });

type Call = { level: string; msg: string; meta?: LogContext };
function recorder(): { log: Logger; calls: Call[] } {
  const calls: Call[] = [];
  const log: Logger = {
    debug: (msg, meta) => void calls.push({ level: "debug", msg, meta }),
    info: (msg, meta) => void calls.push({ level: "info", msg, meta }),
    warn: (msg, meta) => void calls.push({ level: "warn", msg, meta }),
    error: (msg, _err, meta) => void calls.push({ level: "error", msg, meta }),
    child: () => log,
  };
  return { log, calls };
}

describe("recordTestAnalysis", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    engine.throwNext = false;
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  async function record(input: SubmitTestInput, o: { layout?: HandLayoutPrefs; testId?: string } = {}) {
    const { log, calls } = recorder();
    await recordTestAnalysis({
      db: ctx.db, log, userId: "u1", testId: o.testId ?? "t1", input,
      layout: o.layout ?? DEFAULT_HAND_LAYOUT, bigramStates: new Map(), wasCold: true,
    });
    const stored = await ctx.db.testAnalyses.listForUser("u1", { limit: 10 });
    return { calls, stored };
  }

  it("stores a digest equal to buildDigest(analyseRun(...)) for a v2 run", async () => {
    const input = payloadFrom(withMistake(steady(WORDS), { word: 3, pos: 1 }), { ctx: { codeMatch: 1 } });
    const { stored, calls } = await record(input);
    const a = analyseRun({
      timings: input.timings, edits: input.edits, spaces: input.spaces, words: input.words,
      durationMs: input.completedAt - input.startedAt, wpm: input.wpm, lengthMode: "words", ctx: input.ctx,
    })!;
    const expected = buildDigest(a, {
      acc: input.accuracy, wpm: input.wpm, trackedPairs: [], diff: null,
      ctx: digestContext(input.ctx, "keyboard", true, a.quality.qwerty),
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ testId: "t1", bucket: "casual|words|25", version: 1, startedAt: new Date(T0) });
    expect(stored[0]!.digest).toEqual(expected);
    expect(expected.err.n).toBeGreaterThanOrEqual(1);
    expect(expected.ctx.layout).toBe("qwerty");
    expect(calls.filter((c) => c.level === "warn")).toEqual([]);
  });

  it("skips v1 capture", async () => {
    const { stored, calls } = await record(payloadFrom(asV1(steady(WORDS))));
    expect(stored).toEqual([]);
    expect(calls).toEqual([{ level: "debug", msg: "analysis skipped", meta: { reason: "not-v2" } }]);
  });

  it("skips an incomplete run", async () => {
    const { stored, calls } = await record({ ...v2(), wasCompleted: false });
    expect(stored).toEqual([]);
    expect(calls).toEqual([{ level: "debug", msg: "analysis skipped", meta: { reason: "incomplete" } }]);
  });

  it("skips a run with no length unit", async () => {
    const { stored } = await record({ ...v2(), lengthMode: undefined });
    expect(stored).toEqual([]);
  });

  it("skips sudden death and a capped run", async () => {
    const sd = await record(v2({ suddenDeath: true }));
    expect(sd.stored).toEqual([]);
    expect(sd.calls[0]?.meta).toEqual({ reason: "sudden-death" });
    const capped = await record(v2({ capped: true }));
    expect(capped.stored).toEqual([]);
    expect(capped.calls[0]?.meta).toEqual({ reason: "capped" });
  });

  it("skips a run whose replay disagrees with its recorded positions (the engine falls back to v1)", async () => {
    const input = v2();
    const broken = { ...input, timings: input.timings.map((t, i) => (i > 3 ? { ...t, pos: (t.pos ?? 0) + 2 } : t)) };
    const { stored, calls } = await record(broken);
    expect(stored).toEqual([]);
    expect(calls).toEqual([{ level: "debug", msg: "analysis skipped", meta: { reason: "capture-v1" } }]);
  });

  it("puts a touch run in its own bucket and marks a non-standard hand layout", async () => {
    const touch = await record(v2({ input: "touch" }), { testId: "touch" });
    expect(touch.stored[0]!.bucket).toBe("casual|words|25|t");
    const layout: HandLayoutPrefs = {
      ...DEFAULT_HAND_LAYOUT,
      fingers: { ...DEFAULT_HAND_LAYOUT.fingers, L5: { ...DEFAULT_HAND_LAYOUT.fingers.L5, enabled: false } },
    };
    await ctx.reset();
    const custom = await record(v2({ codeMatch: 1 }), { layout, testId: "custom" });
    const digest = custom.stored[0]!.digest as { ctx: { std: boolean; layout: string }; fin: unknown };
    expect(digest.ctx.std).toBe(false);
    expect(digest.ctx.layout).toBe("qwerty");
    expect(digest.fin).toBeNull();
  });

  it("logs a warning and never throws when the engine throws", async () => {
    engine.throwNext = true;
    const { stored, calls } = await record(v2());
    expect(stored).toEqual([]);
    expect(calls).toEqual([
      { level: "warn", msg: "test analysis not stored", meta: { userId: "u1", testId: "t1", reason: "Error" } },
    ]);
  });

  it("logs table-missing and never throws when test_analyses is missing", async () => {
    const own = await createTestDatabase();
    try {
      await own.db.$drizzle.execute(sql.raw("DROP TABLE test_analyses"));
      const { log, calls } = recorder();
      await expect(
        recordTestAnalysis({
          db: own.db, log, userId: "u1", testId: "t1", input: v2(),
          layout: DEFAULT_HAND_LAYOUT, bigramStates: new Map(), wasCold: true,
        }),
      ).resolves.toBeUndefined();
      expect(calls).toEqual([
        { level: "warn", msg: "test analysis not stored", meta: { userId: "u1", testId: "t1", reason: "table-missing" } },
      ]);
    } finally {
      await own.close();
    }
  }, OWN_DB_TIMEOUT_MS);

  it("the warning carries no payload fields, timings or words", async () => {
    engine.throwNext = true;
    const input = v2();
    const { calls } = await record(input);
    const warn = calls.find((c) => c.level === "warn")!;
    expect(Object.keys(warn.meta ?? {}).sort()).toEqual(["reason", "testId", "userId"]);
    const text = JSON.stringify(calls);
    for (const w of WORDS) expect(text).not.toContain(w);
    expect(text).not.toContain(String(input.timings[5]!.t));
  });
});
