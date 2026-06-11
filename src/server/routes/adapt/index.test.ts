import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  // Only the friend-pb fan-out reaches for this, and only when the
  // actor actually has a follower — every other test leaves it unset.
  clerkClient: vi.fn(),
}));

import { ZodError } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  AdaptSnapshotOutput,
  KeystrokeTiming,
  RequestWordsOutput,
  ScoreWordOutput,
  SubmitTestInput,
  SubmitTestOutput,
} from "@/types/adapt";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

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
    mockClerkClient.mockReset();
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

  // ── anti-forgery (FT-002) ──────────────────────────────────────────

  it("submit rejects a WPM above the plausibility ceiling", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({ wpm: 9999 }),
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("submit rejects a WPM the run's keystrokes can't support", async () => {
    signedInAs("u1");
    // Fixture timings (6 keystrokes over 600ms) imply ~120 WPM; 400 is
    // physically impossible for that keystroke stream.
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({ wpm: 400 }),
      }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("submit rejects a completed run reporting WPM with no keystrokes", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({ wpm: 100, timings: [] }),
      }),
    ).rejects.toBeInstanceOf(BackendError);
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

  it("words returns N words from the pool in a single batch by default", async () => {
    signedInAs("u1");
    const pool = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const out = await callRoute<RequestWordsOutput>(["adapt", "words"], {
      db: ctx.db,
      input: { count: 3, pool },
    });
    expect(out.batches.length).toBe(1);
    expect(out.batches[0]!.length).toBe(3);
    expect(out.cold).toBe(true);
    for (const w of out.batches[0]!) expect(pool).toContain(w);
  });

  it("words returns the requested number of batches in one call", async () => {
    signedInAs("u1");
    const pool = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const out = await callRoute<RequestWordsOutput>(["adapt", "words"], {
      db: ctx.db,
      input: { count: 2, pool, batches: 3 },
    });
    expect(out.batches.length).toBe(3);
    for (const b of out.batches) {
      expect(b.length).toBe(2);
      for (const w of b) expect(pool).toContain(w);
    }
  });

  it("words never emits the same word back-to-back across batches", async () => {
    signedInAs("u1");
    // Larger pool, multiple batches — gives the seam plenty of chances
    // to surface a duplicate if the dedup wasn't running.
    const pool = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"];
    const out = await callRoute<RequestWordsOutput>(["adapt", "words"], {
      db: ctx.db,
      input: { count: 3, pool, batches: 5 },
    });
    const flat = out.batches.flat();
    for (let i = 1; i < flat.length; i++) {
      expect(flat[i]).not.toBe(flat[i - 1]);
    }
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

  // ── snapshot ───────────────────────────────────────────────────────

  it("snapshot returns empty buckets and cold=true on a fresh user", async () => {
    signedInAs("u_fresh");
    const snap = await callRoute<AdaptSnapshotOutput>(["adapt", "snapshot"], {
      db: ctx.db,
    });
    expect(snap.cold).toBe(true);
    expect(snap.totalBigramSamples).toBe(0);
    expect(snap.bigrams).toEqual([]);
    expect(snap.trigrams).toEqual([]);
    expect(snap.motorFeatures).toEqual([]);
    expect(snap.recentTests).toEqual([]);
    expect(snap.fatigueDampener).toBe(1);
  });

  it("snapshot reflects state after a submit", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    const snap = await callRoute<AdaptSnapshotOutput>(["adapt", "snapshot"], {
      db: ctx.db,
    });
    expect(snap.bigrams.length).toBeGreaterThan(0);
    expect(snap.recentTests.length).toBe(1);
    expect(snap.recentlyShown.length).toBeGreaterThan(0);
  });

  it("snapshot rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["adapt", "snapshot"], { db: ctx.db }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  // ── scoreWord ──────────────────────────────────────────────────────

  it("scoreWord surfaces bigrams via the exploration bonus when no models exist", async () => {
    signedInAs("u_fresh");
    const r = await callRoute<ScoreWordOutput>(["adapt", "scoreWord"], {
      db: ctx.db,
      input: { word: "the" },
    });
    expect(r.word).toBe("the");
    // Untested bigrams contribute the exploration bonus; trigram /
    // motor-feature dimensions still score 0 because no other signal
    // exists on a fresh user.
    expect(r.bigrams.length).toBe(2);
    expect(r.bigrams.every((b) => b.sampleCount === 0)).toBe(true);
    expect(r.bigrams.every((b) => b.weakness > 0)).toBe(true);
    expect(r.alphaContribution).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThan(0);
    expect(r.trigrams.length).toBe(1);
  });

  it("scoreWord lists per-bigram weakness after data accumulates", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    const r = await callRoute<ScoreWordOutput>(["adapt", "scoreWord"], {
      db: ctx.db,
      input: { word: "the" },
    });
    expect(r.bigrams.find((b) => b.key === "th")?.sampleCount).toBeGreaterThan(0);
  });

  it("scoreWord validates input", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "scoreWord"], { db: ctx.db, input: { word: "" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("first completed run in a (mode, length) bucket fires a personal-best notification", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      // Use casual mode so the cold-algorithm PB gate doesn't kick
      // in. The PB notification path is shared between training and
      // casual; the only difference is the cold-training suppression
      // which the dedicated test below covers.
      input: submitInput({ mode: "casual" }),
    });
    const list = await ctx.db.notifications.listForUser("u1");
    expect(list.length).toBe(1);
    expect(list[0]!.kind).toBe("personal_best");
    // No prior run → previousWpm is null in the payload (signalled
    // via the "First completed run" title path).
    expect(list[0]!.title).toBe("First completed run");
    const data = list[0]!.data as { previousWpm: number | null; wpm: number };
    expect(data.previousWpm).toBeNull();
    expect(data.wpm).toBe(100);
  });

  it("fans a PB out to the actor's friends (mutuals) as a friend_pb notification", async () => {
    // u2 and u1 are mutual friends; u3 only follows u1 (one-way).
    await ctx.db.follows.follow("u2", "u1");
    await ctx.db.follows.follow("u1", "u2");
    await ctx.db.follows.follow("u3", "u1");
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(async () => ({
          data: [
            { id: "u1", firstName: "Ace", username: "ace", emailAddresses: [] },
          ],
          totalCount: 1,
        })),
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "casual" }),
    });
    // The friend (u2) sees a friend_pb.
    const friendFeed = await ctx.db.notifications.listForUser("u2");
    const pb = friendFeed.find((n) => n.kind === "friend_pb");
    expect(pb).toBeTruthy();
    expect(pb?.body).toContain("@Ace");
    // A one-way follower (u3) does NOT — the copy says "a friend".
    const followerFeed = await ctx.db.notifications.listForUser("u3");
    expect(followerFeed.some((n) => n.kind === "friend_pb")).toBe(false);
    // The actor (u1) sees their own PB, not a friend_pb.
    const actorFeed = await ctx.db.notifications.listForUser("u1");
    expect(actorFeed.some((n) => n.kind === "friend_pb")).toBe(false);
  });

  it("beating a prior best in the same bucket fires a fresh PB; slower run does not", async () => {
    signedInAs("u1");
    // First run — opens the bucket. Counts as a PB itself.
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_010_000,
        wpm: 80,
      }),
    });
    // Second run, faster — should fire.
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_020_000,
        completedAt: 1_700_000_030_000,
        wpm: 100,
      }),
    });
    // Third run, slower — should NOT fire.
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_040_000,
        completedAt: 1_700_000_050_000,
        wpm: 95,
      }),
    });
    const list = await ctx.db.notifications.listForUser("u1");
    // Two PB notifications: first-run + the faster run. The slower
    // third run is suppressed.
    expect(list.length).toBe(2);
    const newest = list[0]!;
    expect(newest.kind).toBe("personal_best");
    expect(newest.title).toBe("New personal best");
    const data = newest.data as { previousWpm: number; wpm: number };
    expect(data.previousWpm).toBe(80);
    expect(data.wpm).toBe(100);
  });

  it("training-mode run while the algorithm is cold suppresses the PB notification", async () => {
    signedInAs("u1");
    // No bigram samples seeded → algorithm is cold (< 200 samples).
    // A training PB here would misrepresent the user's real ceiling
    // because the served word pool is still near-random.
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "training" }),
    });
    expect(
      (await ctx.db.notifications.listForUser("u1")).length,
    ).toBe(0);
  });

  it("training-mode run after the algorithm warms fires PB normally", async () => {
    signedInAs("u1");
    // Pre-seed the bigram model with enough samples to clear the
    // cold threshold (200). bulkUpsert takes a Map<key, delta>; one
    // high-sample-count entry is a simpler fixture than typing out
    // 200 keystrokes.
    await ctx.db.bigramModels.bulkUpsert(
      "u1",
      new Map([
        ["th", { meanMs: 110, varianceMs: 1, sampleCount: 250 }],
      ]),
    );
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "training" }),
    });
    const list = await ctx.db.notifications.listForUser("u1");
    expect(list.length).toBe(1);
    expect(list[0]!.kind).toBe("personal_best");
  });

  it("excludeCasualFromAdapt skips the model update for casual runs", async () => {
    signedInAs("u1");
    // Flip the pref before the casual submit.
    await ctx.db.userPrefs.set("u1", {
      behaviour: { excludeCasualFromAdapt: true },
    });
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "casual" }),
    });
    // No bigram rows written despite real timings being submitted.
    expect((await ctx.db.bigramModels.listForUser("u1")).length).toBe(0);
    // Test row + PB notification still landed — they're separate from
    // the model-update path.
    expect((await ctx.db.tests.recentForUser("u1", 10)).length).toBe(1);
    expect((await ctx.db.notifications.listForUser("u1")).length).toBe(1);
  });

  it("training runs still feed the model even when excludeCasualFromAdapt is on", async () => {
    signedInAs("u1");
    await ctx.db.userPrefs.set("u1", {
      behaviour: { excludeCasualFromAdapt: true },
    });
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "training" }),
    });
    // The toggle is casual-only — training keeps contributing.
    expect(
      (await ctx.db.bigramModels.listForUser("u1")).length,
    ).toBeGreaterThan(0);
  });

  it("incomplete runs never fire a PB notification, regardless of WPM", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ wasCompleted: false, wpm: 200 }),
    });
    const list = await ctx.db.notifications.listForUser("u1");
    expect(list).toEqual([]);
  });

  // ── PB verdict in the response (drives the results-screen crown) ─────

  it("returns isPersonalBest=true with previousBest=null on the first run", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "casual", wpm: 80 }),
    });
    expect(out.isPersonalBest).toBe(true);
    expect(out.previousBest).toBeNull();
  });

  it("returns isPersonalBest true for a faster run and false for a slower one", async () => {
    signedInAs("u1");
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_010_000,
        wpm: 80,
      }),
    });
    const faster = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_020_000,
        completedAt: 1_700_000_030_000,
        wpm: 100,
      }),
    });
    expect(faster.isPersonalBest).toBe(true);
    expect(faster.previousBest).toBe(80);
    const slower = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_040_000,
        completedAt: 1_700_000_050_000,
        wpm: 95,
      }),
    });
    // Not a PB — the run was slower than the 100 already on record. This
    // is the crash-the-crown case the bug was about.
    expect(slower.isPersonalBest).toBe(false);
    expect(slower.previousBest).toBe(100);
  });

  it("returns isPersonalBest=false for an incomplete run", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ wasCompleted: false, wpm: 100 }),
    });
    expect(out.isPersonalBest).toBe(false);
  });

  it("returns isPersonalBest=false for a cold training run", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "training" }),
    });
    expect(out.isPersonalBest).toBe(false);
  });
});
