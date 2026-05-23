import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type { InviteToLobbyOutput } from "@/types/lobby";
import type { ListNotificationsOutput } from "@/types/notification";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = { id: string; username?: string | null; firstName?: string | null };

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

function mockKnownUsers(known: ClerkUserLike[]) {
  const byId = new Map(known.map((u) => [u.id, u]));
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async (args?: { userId?: string[] }) => {
        const ids = args?.userId ?? [...byId.keys()];
        const data = ids.map((id) => byId.get(id)).filter((u): u is ClerkUserLike => u != null);
        return { data, totalCount: data.length };
      }),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

const ME = { id: "me", username: "me_handle", firstName: "Me" };
const ALICE = { id: "alice", username: "alice", firstName: "Alice" };
const BOB = { id: "bob", username: "bob", firstName: "Bob" };

async function befriend(ctx: Awaited<ReturnType<typeof createTestDatabase>>) {
  await ctx.db.follows.follow("me", "alice");
  await ctx.db.follows.follow("alice", "me");
}

describe("lobby.invite", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });
  beforeEach(async () => {
    mockAuth.mockReset();
    mockClerkClient.mockReset();
    await ctx.reset();
    mockKnownUsers([ME, ALICE, BOB]);
  });
  afterAll(async () => {
    await ctx.close();
  });

  it("requires auth", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["lobby", "invite"], { db: ctx.db, input: { opponentId: "alice", slug: "swift-wolf-12" } }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("rejects invalid input with a ZodError", async () => {
    signedInAs("me");
    await expect(
      callRoute(["lobby", "invite"], { db: ctx.db, input: { opponentId: "alice" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a non-friend (403) and self (400)", async () => {
    signedInAs("me");
    await expect(
      callRoute(["lobby", "invite"], { db: ctx.db, input: { opponentId: "bob", slug: "x-y-1" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      callRoute(["lobby", "invite"], { db: ctx.db, input: { opponentId: "me", slug: "x-y-1" } }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects when either side has blocked the other", async () => {
    await befriend(ctx);
    await ctx.db.blocks.block("me", "alice");
    signedInAs("me");
    await expect(
      callRoute(["lobby", "invite"], { db: ctx.db, input: { opponentId: "alice", slug: "x-y-1" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("notifies the invited friend with a race_invite carrying the slug", async () => {
    await befriend(ctx);
    signedInAs("me");
    const out = await callRoute<InviteToLobbyOutput>(["lobby", "invite"], {
      db: ctx.db,
      input: { opponentId: "alice", slug: "swift-wolf-12" },
    });
    expect(out.ok).toBe(true);

    const feed = (await callRoute<ListNotificationsOutput>(["notifications", "list"], {
      db: ctx.db,
    })) as ListNotificationsOutput;
    // The recipient (alice) should see it — switch identity to read her feed.
    signedInAs("alice");
    const aliceFeed = await callRoute<ListNotificationsOutput>(["notifications", "list"], {
      db: ctx.db,
    });
    const invite = aliceFeed.items.find((n) => n.kind === "race_invite");
    expect(invite).toBeTruthy();
    const data = invite!.data as { slug: string; inviterId: string };
    expect(data.slug).toBe("swift-wolf-12");
    expect(data.inviterId).toBe("me");
    // Nothing landed in the inviter's own feed.
    expect(feed.items.some((n) => n.kind === "race_invite")).toBe(false);
  });

  it("dedupes a double invite to the same lobby + recipient", async () => {
    await befriend(ctx);
    signedInAs("me");
    const input = { opponentId: "alice", slug: "swift-wolf-12" };
    await callRoute(["lobby", "invite"], { db: ctx.db, input });
    await callRoute(["lobby", "invite"], { db: ctx.db, input });
    signedInAs("alice");
    const feed = await callRoute<ListNotificationsOutput>(["notifications", "list"], { db: ctx.db });
    expect(feed.items.filter((n) => n.kind === "race_invite").length).toBe(1);
  });
});
