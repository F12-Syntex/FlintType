import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type { PresenceListOutput } from "@/types/presence";

const mockAuth = vi.mocked(auth);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe("presence routes", () => {
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

  it("heartbeat requires auth", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["presence", "heartbeat"], { db: ctx.db, input: {} }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("list reports a freshly-heartbeating followee as online", async () => {
    await ctx.db.follows.follow("me", "alice");
    signedInAs("alice");
    await callRoute(["presence", "heartbeat"], { db: ctx.db, input: { status: "racing" } });
    signedInAs("me");
    const out = await callRoute<PresenceListOutput>(["presence", "list"], { db: ctx.db });
    const alice = out.entries.find((e) => e.userId === "alice");
    expect(alice?.online).toBe(true);
    expect(alice?.status).toBe("racing");
  });

  it("list marks a stale heartbeat offline", async () => {
    await ctx.db.follows.follow("me", "alice");
    await ctx.db.presence.heartbeat("alice", "online");
    // Backdate alice's heartbeat well past the online window.
    await ctx.db.$drizzle.execute(
      sql`update presence set last_seen_at = now() - interval '10 minutes' where user_id = 'alice'`,
    );
    signedInAs("me");
    const out = await callRoute<PresenceListOutput>(["presence", "list"], { db: ctx.db });
    expect(out.entries.find((e) => e.userId === "alice")?.online).toBe(false);
  });

  it("list only covers people the caller follows", async () => {
    // bob heartbeats but me doesn't follow bob.
    signedInAs("bob");
    await callRoute(["presence", "heartbeat"], { db: ctx.db, input: {} });
    signedInAs("me");
    const out = await callRoute<PresenceListOutput>(["presence", "list"], { db: ctx.db });
    expect(out.entries.some((e) => e.userId === "bob")).toBe(false);
  });
});
