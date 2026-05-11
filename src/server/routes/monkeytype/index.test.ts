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

/** Multi-endpoint MT mock — picks a response based on the URL path
 *  so the route's four parallel fetches each see the right shape. */
function mockMt(opts: {
  results?: unknown[];
  pbsTime?: Record<string, unknown[]>;
  pbsWords?: Record<string, unknown[]>;
  stats?: Record<string, unknown>;
  status?: number;
  endpointStatus?: Record<string, number>;
}) {
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
    const u = typeof url === "string" ? url : url.toString();
    const status = (() => {
      if (opts.status != null) return opts.status;
      if (opts.endpointStatus) {
        for (const [path, st] of Object.entries(opts.endpointStatus)) {
          if (u.includes(path)) return st;
        }
      }
      return 200;
    })();
    let body: unknown = { data: null };
    if (u.includes("/results")) body = { data: opts.results ?? [] };
    else if (u.includes("/users/personalBests?mode=time"))
      body = { data: opts.pbsTime ?? {} };
    else if (u.includes("/users/personalBests?mode=words"))
      body = { data: opts.pbsWords ?? {} };
    else if (u.includes("/users/stats")) body = { data: opts.stats ?? {} };
    return {
      ok: status < 400,
      status,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
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
    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "" },
        db: ctx.db,
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("imports last 10 tests + PBs + stats into local store", async () => {
    signedInAs("user_1");
    mockMt({
      results: [
        mtResult({ _id: "a", timestamp: 1_700_000_000_000 }),
        mtResult({ _id: "b", timestamp: 1_700_000_001_000 }),
      ],
      pbsTime: {
        "15": [{ wpm: 110, acc: 95.5 }],
        "60": [{ wpm: 95, acc: 96.4 }],
      },
      pbsWords: {
        "25": [{ wpm: 100, acc: 97 }],
      },
      stats: {
        completedTests: 1284,
        startedTests: 1500,
        timeTyping: 65000,
      },
    });

    const out = await callRoute<MonkeytypeImportOutput>(
      ["monkeytype", "import"],
      { input: { apiKey: "valid_key_xxx" }, db: ctx.db },
    );

    expect(out.imported).toBe(2);
    expect(out.skipped).toBe(0);
    expect(out.fetched).toBe(2);
    expect(out.pbsImported).toBe(3); // 2 time + 1 words
    expect(out.stats.completedTests).toBe(1284);
    // Output now ships the full slice for client-side cache update.
    expect(out.slice.pbs.time["15"]).toEqual({ wpm: 110, acc: 95.5 });
    expect(out.slice.encryptedApiKey).toBeTruthy();

    const stored = await ctx.db.tests.recentForUser("user_1", 100);
    expect(stored).toHaveLength(2);

    const prefs = await ctx.db.userPrefs.get("user_1");
    const slice = prefs.monkeytypeStats as
      | { pbs: { time: Record<string, unknown> }; completedTests?: number }
      | undefined;
    expect(slice).toBeTruthy();
    expect(slice?.pbs.time["15"]).toEqual({ wpm: 110, acc: 95.5 });
    expect(slice?.completedTests).toBe(1284);
  });

  it("auto-syncs using the stored encrypted key when input.apiKey is omitted", async () => {
    signedInAs("user_1");
    // Seed: first import stores the encrypted key.
    mockMt({
      results: [],
      pbsTime: { "30": [{ wpm: 100, acc: 96 }] },
      pbsWords: {},
      stats: { completedTests: 50 },
    });
    await callRoute(["monkeytype", "import"], {
      input: { apiKey: "first_pasted_xxx" },
      db: ctx.db,
    });

    // Now flip the mock to a fresh dataset and call import with NO
    // apiKey — the route should decrypt the stored one and pull
    // again, surfacing the new numbers.
    mockMt({
      results: [],
      pbsTime: { "30": [{ wpm: 130, acc: 97 }] },
      pbsWords: {},
      stats: { completedTests: 99 },
    });
    const out = await callRoute<MonkeytypeImportOutput>(
      ["monkeytype", "import"],
      { input: {}, db: ctx.db },
    );
    expect(out.slice.pbs.time["30"]).toEqual({ wpm: 130, acc: 97 });
    expect(out.stats.completedTests).toBe(99);
  });

  it("rejects an empty-input call when no key has ever been stored", async () => {
    signedInAs("user_1");
    await expect(
      callRoute(["monkeytype", "import"], { input: {}, db: ctx.db }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("disconnect wipes the slice but preserves unrelated prefs and tests", async () => {
    signedInAs("user_1");
    // Seed unrelated pref + an MT-imported test row.
    await ctx.db.userPrefs.set("user_1", { caret: { style: "block" } });
    await ctx.db.tests.insert({
      id: "mt_seed",
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
    // Stash an MT slice via an import.
    mockMt({
      results: [],
      pbsTime: { "30": [{ wpm: 100, acc: 96 }] },
      pbsWords: {},
      stats: { completedTests: 50 },
    });
    await callRoute(["monkeytype", "import"], {
      input: { apiKey: "key_abc_xxx" },
      db: ctx.db,
    });
    expect(
      (await ctx.db.userPrefs.get("user_1")).monkeytypeStats,
    ).toBeTruthy();

    // Disconnect.
    const out = await callRoute<{ ok: true }>(
      ["monkeytype", "disconnect"],
      { db: ctx.db },
    );
    expect(out.ok).toBe(true);

    const prefs = await ctx.db.userPrefs.get("user_1");
    expect(prefs.monkeytypeStats).toBeUndefined();
    expect(prefs.caret).toEqual({ style: "block" });

    // Tests stay — disconnect only clears the prefs slice.
    const stored = await ctx.db.tests.recentForUser("user_1", 100);
    expect(stored).toHaveLength(1);
  });

  it("preserves unrelated user_prefs slices on import", async () => {
    signedInAs("user_1");
    await ctx.db.userPrefs.set("user_1", { caret: { style: "block" } });
    mockMt({ results: [], pbsTime: {}, pbsWords: {}, stats: {} });

    await callRoute(["monkeytype", "import"], {
      input: { apiKey: "valid_key_xxx" },
      db: ctx.db,
    });

    const prefs = await ctx.db.userPrefs.get("user_1");
    expect(prefs.caret).toEqual({ style: "block" });
    expect(prefs.monkeytypeStats).toBeTruthy();
  });

  it("dedupes results that already exist by startedAt", async () => {
    signedInAs("user_1");
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
    mockMt({
      results: [
        mtResult({ _id: "a", timestamp: 1_700_000_000_000 }),
        mtResult({ _id: "b", timestamp: 1_700_000_001_000 }),
      ],
    });

    const out = await callRoute<MonkeytypeImportOutput>(
      ["monkeytype", "import"],
      { input: { apiKey: "valid_key_xxx" }, db: ctx.db },
    );

    expect(out.imported).toBe(1);
    expect(out.skipped).toBe(1);
  });

  it("maps an MT 401 response to BackendError UNAUTHORIZED", async () => {
    signedInAs("user_1");
    mockMt({ status: 401 });

    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "wrong_key_xxx" },
        db: ctx.db,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("maps an MT 429 response to BackendError RATE_LIMITED", async () => {
    signedInAs("user_1");
    mockMt({ status: 429 });

    await expect(
      callRoute(["monkeytype", "import"], {
        input: { apiKey: "valid_key_xxx" },
        db: ctx.db,
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
