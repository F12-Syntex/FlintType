import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  KeystrokeTiming,
  RequestWordsOutput,
  SubmitTestInput,
  SubmitTestOutput,
} from "@/types/adapt";

const mockAuth = vi.mocked(auth);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

/** Build a synthetic timing stream where every keystroke is correct
 *  and inter-key intervals are constant. Generates measurable bigram
 *  and trigram samples without random noise so assertions are
 *  deterministic. */
function streamFor(words: string[], gapMs = 120): KeystrokeTiming[] {
  const out: KeystrokeTiming[] = [];
  let t = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi]!;
    for (let i = 0; i < w.length; i++) {
      out.push({
        t,
        expected: w[i]!,
        typed: w[i]!,
        correct: true,
        wordIndex: wi,
      });
      t += gapMs;
    }
    // Skip the space gap — wordIndex already changes at the next word.
    t += gapMs;
  }
  return out;
}

function submitInput(
  over: Partial<SubmitTestInput> = {},
): SubmitTestInput {
  const words = ["the", "and"];
  return {
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_010_000,
    mode: "training",
    durationOrWordCount: 25,
    wpm: 100,
    accuracy: 100,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    words,
    timings: streamFor(words),
    ...over,
  };
}

describe("adapt routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    mockAuth.mockReset();
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  // ── auth ───────────────────────────────────────────────────────────

  it("submit rejects unauthenticated calls", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["adapt", "submit"], { db: ctx.db, input: submitInput() }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("words rejects unauthenticated calls", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["adapt", "words"], {
        db: ctx.db,
        input: { count: 5, pool: ["a"] },
      }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  // ── validation ─────────────────────────────────────────────────────

  it("submit validates wire shape", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: { mode: "training" },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("words validates wire shape", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "words"], {
        db: ctx.db,
        input: { count: 0, pool: [] },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  // ── happy path ─────────────────────────────────────────────────────

  it("submit persists a test row and returns measurement counts", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    expect(out.testId).toBeTruthy();
    expect(out.measurementsAccepted).toBeGreaterThan(0);
    const recent = await ctx.db.tests.recentForUser("u1", 10);
    expect(recent.length).toBe(1);
    expect(recent[0]!.id).toBe(out.testId);
  });

  it("submit folds samples into the bigram model", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    const rows = await ctx.db.bigramModels.listForUser("u1");
    // 'the' contributes th, he; 'and' contributes an, nd.
    const bigrams = rows.map((r) => r.bigram).sort();
    expect(bigrams).toEqual(["an", "he", "nd", "th"]);
  });

  it("submit advances the recency map", async () => {
    signedInAs("u1");
    const words = ["foo", "bar"];
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ words, timings: streamFor(words) }),
    });
    const blob = await ctx.db.userPrefs.get("u1");
    const recency = blob.adaptRecency as Record<string, number>;
    expect(recency.foo).toBe(0);
    expect(recency.bar).toBe(0);
  });

  it("words returns N words from the pool", async () => {
    signedInAs("u1");
    const pool = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const out = await callRoute<RequestWordsOutput>(["adapt", "words"], {
      db: ctx.db,
      input: { count: 3, pool },
    });
    expect(out.words.length).toBe(3);
    expect(out.cold).toBe(true);
    for (const w of out.words) expect(pool).toContain(w);
  });

  it("two submits in a row both persist", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    const recent = await ctx.db.tests.recentForUser("u1", 10);
    expect(recent.length).toBe(2);
  });

  it("isolates one user's models from another's", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    signedInAs("u2");
    const rows = await ctx.db.bigramModels.listForUser("u2");
    expect(rows).toEqual([]);
  });
});
