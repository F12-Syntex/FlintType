import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { _resetRateLimitStore } from "@/server/middleware/rate-limit";
import { callRoute } from "@/server/testing";
import type { MonkeytypeImportOutput } from "@/types/monkeytype";

const mockAuth = vi.mocked(auth);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

const ORIGINAL_FETCH = globalThis.fetch;

function mockMtResults(results: unknown[], opts: { status?: number } = {}) {
  globalThis.fetch = vi.fn(async () => ({
    ok: (opts.status ?? 200) < 400,
    status: opts.status ?? 200,
    json: async () => ({ data: results }),
  })) as unknown as typeof fetch;
}

function mtResult(over: Record<string, unknown> = {}) {
  return {
    _id: "abc123",
    wpm: 95,
    rawWpm: 105,
    acc: 96.4,
    consistency: 78,
    mode: "time",
    mode2: "60",
    timestamp: 1_700_000_000_000,
    testDuration: 60,
    incorrectChars: 4,
    correctChars: 350,
    ...over,
  };
}

describe("monkeytype.import route", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });
  afterAll(async () => {
    await ctx.close();
    globalThis.fetch = ORIGINAL_FETCH;
  });
  beforeEach(async () => {
    await ctx.reset();
    mockAuth.mockReset();
    // Rate-limit store is in-memory and process-wide; clear it
    // between tests so the per-user 3/hr cap doesn't leak.
    _resetRateLimitStore();
  });

  it("rejects when not signed in", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "valid_key_xxx" },
        db: ctx.db,
      }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("rejects an invalid API key (Zod validation)", async () => {
    signedInAs("user_1");
    // The HTTP dispatcher converts ZodError → BackendError(VALIDATION),
    // but the in-process callRoute helper bypasses that wrap, so the
    // raw ZodError surfaces here. Either is fine — both code paths
    // refuse the request before reaching MT.
    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "" },
        db: ctx.db,
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("imports MT results into the local tests table", async () => {
    signedInAs("user_1");
    mockMtResults([
      mtResult({ _id: "a", timestamp: 1_700_000_000_000 }),
      mtResult({ _id: "b", timestamp: 1_700_000_001_000 }),
      mtResult({ _id: "c", timestamp: 1_700_000_002_000 }),
    ]);

    const out = await callRoute<MonkeytypeImportOutput>(
      ["monkeytype", "import"],
      { input: { apiKey: "valid_key_xxx" }, db: ctx.db },
    );

    expect(out).toEqual({ imported: 3, skipped: 0, fetched: 3 });
    const stored = await ctx.db.tests.recentForUser("user_1", 100);
    expect(stored).toHaveLength(3);
    expect(stored[0]?.userId).toBe("user_1");
    expect(stored[0]?.mode).toBe("casual");
    expect(stored[0]?.wasCompleted).toBe(true);
  });

  it("dedupes results that already exist by startedAt", async () => {
    signedInAs("user_1");
    // Pre-seed one row at the same timestamp the MT result will use.
    await ctx.db.tests.insert({
      id: "existing",
      userId: "user_1",
      startedAt: new Date(1_700_000_000_000),
      completedAt: new Date(1_700_000_000_000 + 60_000),
      mode: "casual",
      durationOrWordCount: 60,
      wpm: 80,
      accuracy: 95,
      errorCount: 1,
      resetCount: 0,
      wasCompleted: true,
    });
    mockMtResults([
      mtResult({ _id: "a", timestamp: 1_700_000_000_000 }),
      mtResult({ _id: "b", timestamp: 1_700_000_001_000 }),
    ]);

    const out = await callRoute<MonkeytypeImportOutput>(
      ["monkeytype", "import"],
      { input: { apiKey: "valid_key_xxx" }, db: ctx.db },
    );

    expect(out).toEqual({ imported: 1, skipped: 1, fetched: 2 });
  });

  it("maps an MT 401 response to BackendError UNAUTHORIZED", async () => {
    signedInAs("user_1");
    mockMtResults([], { status: 401 });

    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "wrong_key_xxx" },
        db: ctx.db,
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("maps an MT 429 response to BackendError RATE_LIMITED", async () => {
    signedInAs("user_1");
    mockMtResults([], { status: 429 });

    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "valid_key_xxx" },
        db: ctx.db,
      }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
