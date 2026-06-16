import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(async () => ({
    users: {
      // Default no-op stubs so `ensureUser` → `grantOg` can run without
      // throwing during the auth'd summary path. Individual tests
      // override `clerkClient` when they need a specific user lookup
      // (publicProfile path) by re-mocking before the call.
      getUser: vi.fn(async (id: string) => ({ id, publicMetadata: {} })),
      updateUserMetadata: vi.fn(async () => undefined),
      getUserList: vi.fn(async () => ({ data: [], totalCount: 0 })),
    },
  })),
}));

import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  KeystrokeTiming,
  SubmitTestInput,
  SubmitTestOutput,
} from "@/types/adapt";
import type { HistorySummaryOutput } from "@/types/history";

const mockAuth = vi.mocked(auth);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

/** Synthetic keystroke stream — same shape adapt's tests use. */
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
    t += gapMs;
  }
  return out;
}

function submitInput(over: Partial<SubmitTestInput> = {}): SubmitTestInput {
  const words = ["the", "and"];
  return {
    // 1s elapsed keeps the claimed 100 wpm inside the submit
    // plausibility ceiling for this small fixture payload (#38).
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_001_000,
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

describe("history routes", () => {
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

  it("rejects unauthenticated calls", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["history", "summary"], { db: ctx.db }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("returns empty buckets and cold=true on a fresh user", async () => {
    signedInAs("u_fresh");
    const out = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(out.cold).toBe(true);
    expect(out.recentTests).toEqual([]);
    expect(out.weakestPairs).toEqual([]);
    expect(out.weakestTrigrams).toEqual([]);
    expect(out.trigramBaselineMs).toBe(0);
    expect(out.bigramBaselineMs).toBe(0);
  });

  it("surfaces a submitted test in recentTests", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    const out = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(out.recentTests.length).toBe(1);
    expect(out.recentTests[0]!.wpm).toBe(100);
    expect(out.recentTests[0]!.mode).toBe("training");
  });

  it("scopes results per user", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    signedInAs("u2");
    const out = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(out.recentTests).toEqual([]);
    // The summary identifies its subject so the profile hero can
    // resolve the follow relationship for a visitor.
    expect(out.subjectUserId).toBe("u2");
  });

  it("returns the subject's MT slice on summary, stripped of the encrypted Ape Key", async () => {
    signedInAs("u_mt");
    // Simulate a previous import: write the slice straight into the
    // user_prefs blob. The summary route reads from there.
    await ctx.db.userPrefs.set("u_mt", {
      monkeytypeStats: {
        importedAt: 1_700_000_000_000,
        completedTests: 1_284,
        startedTests: 1_500,
        timeTyping: 89_400,
        pbs: {
          time: { "60": { wpm: 142, acc: 97.4 } },
          words: { "50": { wpm: 138, acc: 96.1 } },
        },
        encryptedApiKey: { v: 1, iv: "iv", tag: "tag", ct: "ct" },
      },
    });
    const out = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(out.monkeytype).not.toBeNull();
    expect(out.monkeytype?.completedTests).toBe(1_284);
    expect(out.monkeytype?.pbs.time["60"]?.wpm).toBe(142);
    // The encrypted Ape Key must NEVER cross the wire — even on the
    // owner's own summary call, the credential stays server-side.
    expect(
      (out.monkeytype as Record<string, unknown> | null)?.encryptedApiKey,
    ).toBeUndefined();
  });

  it("defaults rank to null and surfaces a valid self-selected rank", async () => {
    signedInAs("u_rank");
    const fresh = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(fresh.rank).toBeNull();

    await ctx.db.userPrefs.set("u_rank", { profileRank: { id: "forge" } });
    const picked = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(picked.rank).toBe("forge");

    // Garbage in the pref blob coerces to null, never crosses the wire.
    await ctx.db.userPrefs.set("u_rank", { profileRank: { id: "not_a_rank" } });
    const bad = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    expect(bad.rank).toBeNull();
  });

  it("returns weakestPairs sorted by weakness, capped at 12", async () => {
    signedInAs("u1");
    // 30 deliberate runs of 4-letter words — generates enough bigram
    // samples that some cross the MIN_SAMPLES_FOR_WEAKNESS threshold.
    const phrases = ["pack ship work hold sing dial bind move tone fold"];
    for (const phrase of phrases) {
      const ws = phrase.split(" ");
      for (let i = 0; i < 5; i++) {
        await callRoute<SubmitTestOutput>(["adapt", "submit"], {
          db: ctx.db,
          input: submitInput({
            // 6s elapsed spans the 10-word keystroke stream (last `t`
            // ~5.8s at the default 120ms gap) while keeping the default
            // 100-wpm claim under the stream-derived ceiling (40
            // keystrokes / 6s → ~120 credible) (#38). Runs are staggered
            // 10s apart, wider than the elapsed, so they never overlap.
            startedAt: 1_700_000_000_000 + i * 10_000,
            completedAt: 1_700_000_006_000 + i * 10_000,
            words: ws,
            timings: streamFor(ws),
          }),
        });
      }
    }
    const out = await callRoute<HistorySummaryOutput>(
      ["history", "summary"],
      { db: ctx.db },
    );
    // Sorted desc by weakness — pairs returned all have weakness > 0.
    for (let i = 1; i < out.weakestPairs.length; i++) {
      expect(out.weakestPairs[i - 1]!.weakness).toBeGreaterThanOrEqual(
        out.weakestPairs[i]!.weakness,
      );
    }
    expect(out.weakestPairs.length).toBeLessThanOrEqual(12);
  });
});
