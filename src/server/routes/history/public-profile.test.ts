import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { _resetRateLimitStore } from "@/server/middleware/rate-limit";
import { callRoute } from "@/server/testing";
import type { ModelDelta } from "@/types/adapt";
import type { HistorySummaryOutput, ProfileSnapshot } from "@/types/history";

const SUBJECT = "user_pub";
const MODEL_KEYS = [
  "weakestPairs",
  "weakestTrigrams",
  "weakestWords",
  "bigramBaselineMs",
  "trigramBaselineMs",
  "wordBaselineMs",
  "cold",
];
const SNAPSHOT_KEYS = [
  "eligibleTags",
  "lifetimeStats",
  "monkeytype",
  "rank",
  "recentTests",
  "subjectAvatarUrl",
  "subjectUserId",
  "tags",
];

const clerkUser = {
  id: SUBJECT,
  username: "pubby",
  emailAddresses: [{ emailAddress: "pub@example.com" }],
  publicMetadata: {},
  hasImage: false,
  imageUrl: "",
};

function mockClerk() {
  vi.mocked(clerkClient).mockResolvedValue({
    users: {
      getUser: vi.fn(async (id: string) => {
        if (id !== SUBJECT) throw new Error("Not Found");
        return clerkUser;
      }),
      getUserList: vi.fn(async ({ username }: { username?: string[] }) => ({
        data: username?.includes("pubby") ? [clerkUser] : [],
        totalCount: 0,
      })),
      updateUserMetadata: vi.fn(async () => undefined),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

const delta = (meanMs: number, sampleCount = 30): ModelDelta => ({
  meanMs,
  varianceMs: 100,
  sampleCount,
});

describe("history.publicProfile", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    vi.mocked(auth).mockReset();
    vi.mocked(clerkClient).mockReset();
    vi.restoreAllMocks();
    _resetRateLimitStore();
    mockClerk();
    await ctx.reset();
    // Seed every timing model with clearly weak entries, so a leak
    // would show up as non-empty lists and non-zero baselines.
    const pairs = new Map<string, ModelDelta>([["th", delta(400)], ["he", delta(90)], ["an", delta(95)]]);
    for (let i = 0; i < 10; i++) pairs.set(`a${String.fromCharCode(98 + i)}`, delta(100));
    await ctx.db.bigramModels.bulkUpsert(SUBJECT, pairs);
    await ctx.db.trigramModels.bulkUpsert(SUBJECT, new Map([["the", delta(600)], ["and", delta(200)]]));
    await ctx.db.wordModels.bulkUpsert(SUBJECT, new Map([["their", delta(900)], ["and", delta(300)]]));
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("returns the profile snapshot and no timing-derived fields (I6)", async () => {
    const out = await callRoute<ProfileSnapshot>(["history", "publicProfile"], {
      db: ctx.db,
      input: { username: "pubby" },
    });
    const keys = Object.keys(JSON.parse(JSON.stringify(out)) as object);
    for (const k of MODEL_KEYS) expect(keys).not.toContain(k);
    expect(keys.sort()).toEqual(SNAPSHOT_KEYS);
    expect(out.subjectUserId).toBe(SUBJECT);
  });

  it("never reads the model tables", async () => {
    const spies = [
      vi.spyOn(ctx.db.bigramModels, "listForUser"),
      vi.spyOn(ctx.db.trigramModels, "listForUser"),
      vi.spyOn(ctx.db.wordModels, "listForUser"),
      vi.spyOn(ctx.db.motorFeatureModels, "listForUser"),
    ];
    await callRoute(["history", "publicProfile"], { db: ctx.db, input: { username: SUBJECT } });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("still gives the owner every field on summary", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: SUBJECT,
      sessionClaims: {},
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const out = await callRoute<HistorySummaryOutput>(["history", "summary"], { db: ctx.db });
    const keys = Object.keys(out);
    for (const k of [...MODEL_KEYS, ...SNAPSHOT_KEYS]) expect(keys).toContain(k);
    expect(out.weakestPairs[0]?.key).toBe("th");
    expect(out.weakestTrigrams[0]?.key).toBe("the");
    expect(out.bigramBaselineMs).toBeGreaterThan(0);
  });

  it("rejects an empty username", async () => {
    // The dispatcher maps a ZodError to VALIDATION 400.
    await expect(
      callRoute(["history", "publicProfile"], { db: ctx.db, input: { username: "" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("is NOT_FOUND for an unknown username or user id", async () => {
    for (const username of ["nobody", "user_missing"]) {
      const err = await callRoute(["history", "publicProfile"], {
        db: ctx.db,
        input: { username },
      }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BackendError);
      expect((err as BackendError).code).toBe("NOT_FOUND");
    }
  });
});
