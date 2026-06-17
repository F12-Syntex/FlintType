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
import { persistAdaptPrefs } from "./prefs";
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

  it("submit persists the lengthMode discriminator onto the row", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ lengthMode: "time" }),
    });
    const row = await ctx.db.tests.findById(out.testId);
    expect(row?.lengthMode).toBe("time");
  });

  it("submit persists null lengthMode when the client omits it", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput(),
    });
    const row = await ctx.db.tests.findById(out.testId);
    expect(row?.lengthMode).toBeNull();
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

  it("fans a PB out to the actor's followers as a friend_pb notification", async () => {
    // u2 follows u1; u1 sets a PB.
    await ctx.db.follows.follow("u2", "u1");
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
    // The follower (u2) sees a friend_pb; the actor (u1) sees their own PB.
    const followerFeed = await ctx.db.notifications.listForUser("u2");
    const pb = followerFeed.find((n) => n.kind === "friend_pb");
    expect(pb).toBeTruthy();
    expect(pb?.body).toContain("@Ace");
    // Non-followers get nothing.
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
        completedAt: 1_700_000_001_000,
        wpm: 80,
      }),
    });
    // Second run, faster — should fire.
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_020_000,
        completedAt: 1_700_000_021_000,
        wpm: 100,
      }),
    });
    // Third run, slower — should NOT fire.
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_040_000,
        completedAt: 1_700_000_041_000,
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

  it("persistAdaptPrefs merges its slices — a write landing after the load survives", async () => {
    // Simulates the lost-update race: the client flushes a slice while
    // adapt.submit is between its prefs read and its prefs write. With
    // the old read-modify-write the concurrent slice was reverted;
    // with the atomic merge it survives.
    await ctx.db.userPrefs.set("u1", { caret: { style: "block" } });
    // "Concurrent" client write after adapt loaded its snapshot.
    await ctx.db.userPrefs.merge("u1", { theme: { "--primary": "#1e90ff" } });
    await persistAdaptPrefs(ctx.db, "u1", {
      adaptRecency: new Map([["the", 1]]),
      adaptFingerMapHash: "h1",
    });
    const stored = await ctx.db.userPrefs.get("u1");
    expect(stored.caret).toEqual({ style: "block" });
    expect(stored.theme).toEqual({ "--primary": "#1e90ff" }); // not reverted
    expect(stored.adaptRecency).toEqual({ the: 1 });
    expect(stored.adaptFingerMapHash).toBe("h1");
  });

  it("submit preserves unrelated prefs slices while writing adapt state", async () => {
    signedInAs("u1");
    await ctx.db.userPrefs.set("u1", { caret: { style: "underline" } });
    await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "training" }),
    });
    const stored = await ctx.db.userPrefs.get("u1");
    expect(stored.caret).toEqual({ style: "underline" });
    expect(stored.adaptRecency).toBeTruthy();
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
        completedAt: 1_700_000_001_000,
        wpm: 80,
      }),
    });
    const faster = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        startedAt: 1_700_000_020_000,
        completedAt: 1_700_000_021_000,
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
        completedAt: 1_700_000_041_000,
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
      input: submitInput({ wasCompleted: false, wpm: 450 }),
    });
    expect(out.isPersonalBest).toBe(false);
  });

  // ── anti-forgery (issue #38) ─────────────────────────────────────

  it("schema rejects wpm above the hard 500 cap", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({ wpm: 501 }),
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("schema rejects unbounded errorCount / resetCount / durationOrWordCount", async () => {
    signedInAs("u1");
    for (const over of [
      { errorCount: 100_001 },
      { resetCount: 10_001 },
      { durationOrWordCount: 10_001 },
    ]) {
      await expect(
        callRoute(["adapt", "submit"], {
          db: ctx.db,
          input: submitInput(over),
        }),
      ).rejects.toBeInstanceOf(ZodError);
    }
  });

  it("rejects a completed run whose claimed wpm exceeds what the payload could produce", async () => {
    signedInAs("u1");
    // 7 chars of payload over 10s can credit ~13 wpm at most — a
    // claimed 300 is a clear forgery. Nothing may be written.
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({
          wpm: 300,
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_010_000,
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
    expect(await ctx.db.notifications.listForUser("u1")).toEqual([]);
  });

  it("rejects a completed high-wpm run with empty words and timings", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({ wpm: 200, words: [], timings: [] }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
  });

  it("rejects the padded-words bypass: long fabricated words + empty timings + 500 wpm", async () => {
    signedInAs("u1");
    // The #38 bypass: `words` is client-controlled and unverified, so a
    // forger pads it to inflate the volume past the ceiling while
    // POSTing an empty keystroke stream. The ceiling now comes from
    // `timings` only, so volume is 0 → ceiling 0 → the 500-wpm claim is
    // rejected and nothing is written.
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({
          wpm: 500,
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_060_000,
          words: Array.from({ length: 2000 }, () => "padding"),
          timings: [],
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
    expect(await ctx.db.notifications.listForUser("u1")).toEqual([]);
  });

  it("rejects the elapsed-compression bypass: a sub-second completed run", async () => {
    signedInAs("u1");
    // A 1 ms elapsed would make the volume ceiling explode (one keystroke
    // "credits" thousands of wpm). The MIN_COMPLETED_RUN_MS floor rejects
    // any fast completed run that claims to have finished this quickly.
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({
          wpm: 499,
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_100, // 100 ms elapsed
          words: ["the"],
          timings: [
            { t: 0, expected: "t", typed: "t", correct: true, wordIndex: 0 },
          ],
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
    expect(await ctx.db.notifications.listForUser("u1")).toEqual([]);
  });

  it("rejects the all-t=0 padding bypass: volume cleared, keystrokes packed into an instant", async () => {
    signedInAs("u1");
    // A forger pads `timings` with enough entries to clear the volume
    // ceiling, but times every keystroke at t=0 to dodge the monotonic /
    // within-elapsed check. The keystroke-density cap catches it: 2000
    // keystrokes spanning 0 ms is an infinite raw rate — physically
    // impossible — so the 499-wpm claim is rejected and nothing is written.
    const timings = Array.from({ length: 2000 }, () => ({
      t: 0,
      expected: "a",
      typed: "a",
      correct: true,
      wordIndex: 0,
    }));
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({
          wpm: 499,
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_060_000, // 60 s elapsed
          words: ["the", "and"],
          timings,
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
    expect(await ctx.db.notifications.listForUser("u1")).toEqual([]);
  });

  it("rejects a completed run whose timings are timed beyond the run's elapsed", async () => {
    signedInAs("u1");
    // A fabricated stream whose `t` values run far past the claimed 1s
    // elapsed is inconsistent and bounced before the volume check.
    const timings = streamFor(["the", "and"], 5_000); // span ~30s
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({
          wpm: 100,
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_001_000,
          timings,
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await ctx.db.tests.recentForUser("u1", 10)).toEqual([]);
  });

  it("rejects a completed run with completedAt before startedAt", async () => {
    signedInAs("u1");
    await expect(
      callRoute(["adapt", "submit"], {
        db: ctx.db,
        input: submitInput({
          startedAt: 1_700_000_010_000,
          completedAt: 1_700_000_000_000,
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("accepts a legitimate fast run whose payload supports the claim, and it PBs", async () => {
    signedInAs("u1");
    // ~300 wpm for 12s: 60 four-letter words = 299 passage chars,
    // keystrokes at 40ms gaps — exactly what a real elite run ships.
    const words = Array.from({ length: 60 }, (_, i) =>
      ["pack", "ship", "work", "hold", "sing", "dial"][i % 6]!,
    );
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({
        mode: "casual",
        wpm: 300,
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_012_000,
        words,
        timings: streamFor(words, 40),
      }),
    });
    expect(out.testId).toBeTruthy();
    expect(out.isPersonalBest).toBe(true);
    expect((await ctx.db.tests.recentForUser("u1", 10)).length).toBe(1);
  });

  it("accepts a legitimate race-mode run (the live race submit path)", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ mode: "race" }),
    });
    expect(out.testId).toBeTruthy();
    const recent = await ctx.db.tests.recentForUser("u1", 10);
    expect(recent[0]!.mode).toBe("race");
  });

  it("skips the plausibility check below the verify floor (sparse slow runs stay friction-free)", async () => {
    signedInAs("u1");
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      // 30 wpm claim with an empty payload over 60s — unverifiable but
      // harmless; must not bounce.
      input: submitInput({
        wpm: 30,
        words: [],
        timings: [],
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_060_000,
      }),
    });
    expect(out.testId).toBeTruthy();
  });

  it("incomplete runs skip the plausibility check entirely", async () => {
    signedInAs("u1");
    // Abandoned-run telemetry can carry whatever partial stats the
    // client had — it's never leaderboard- or PB-eligible anyway.
    const out = await callRoute<SubmitTestOutput>(["adapt", "submit"], {
      db: ctx.db,
      input: submitInput({ wasCompleted: false, wpm: 400, timings: [] }),
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
