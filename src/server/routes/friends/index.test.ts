import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ZodError } from "zod";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  FriendListOutput,
  FriendRelationship,
  FriendStats,
} from "@/types/friends";
import type { ListNotificationsOutput } from "@/types/notification";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  emailAddresses?: { emailAddress: string }[];
  publicMetadata?: Record<string, unknown> | null;
};

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

/** getUserList returns only the requested ids that are "known", so an
 *  id not in `known` resolves to "user doesn't exist". */
function mockKnownUsers(known: ClerkUserLike[]) {
  const byId = new Map(known.map((u) => [u.id, u]));
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async (args?: { userId?: string[] }) => {
        const ids = args?.userId ?? [...byId.keys()];
        const data = ids
          .map((id) => byId.get(id))
          .filter((u): u is ClerkUserLike => u != null);
        return { data, totalCount: data.length };
      }),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

const ME = { id: "me", username: "me_handle", firstName: "Me" };
const ALICE = { id: "alice", username: "alice", firstName: "Alice" };
const BOB = { id: "bob", username: "bob", firstName: "Bob" };

describe("friends routes", () => {
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

  /* ── auth + validation ─────────────────────────────────────── */

  it("rejects anonymous callers (requireAuth)", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "alice" } }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("rejects missing/invalid input with a ZodError", async () => {
    signedInAs("me");
    await expect(
      callRoute(["friends", "follow"], { db: ctx.db, input: {} }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  /* ── follow ────────────────────────────────────────────────── */

  it("follow creates the edge and returns the relationship", async () => {
    signedInAs("me");
    const rel = await callRoute<FriendRelationship>(["friends", "follow"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(rel).toMatchObject({
      userId: "alice",
      following: true,
      followedBy: false,
      mutual: false,
    });
    expect(await ctx.db.follows.isFollowing("me", "alice")).toBe(true);
  });

  it("follow notifies the target once (idempotent re-follow does not double-fire)", async () => {
    signedInAs("me");
    await callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "alice" } });
    await callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "alice" } });
    // The follow notification lands in alice's feed, deduped.
    signedInAs("alice");
    const out = await callRoute<ListNotificationsOutput>(
      ["notifications", "list"],
      { db: ctx.db },
    );
    const follows = out.items.filter((n) => n.kind === "follow");
    expect(follows).toHaveLength(1);
    expect(follows[0]?.body).toContain("@Me");
  });

  it("completing a reciprocal follow makes them friends + notifies both", async () => {
    // alice already follows me; now I follow alice back.
    await ctx.db.follows.follow("alice", "me");
    signedInAs("me");
    const rel = await callRoute<FriendRelationship>(["friends", "follow"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(rel.mutual).toBe(true);

    for (const uid of ["me", "alice"]) {
      signedInAs(uid);
      const out = await callRoute<ListNotificationsOutput>(
        ["notifications", "list"],
        { db: ctx.db },
      );
      expect(out.items.some((n) => n.kind === "mutual")).toBe(true);
    }

    // Flap the friendship: unfollow then re-follow. The mutual
    // notification is keyed on the sorted pair, so re-completing the
    // friendship must NOT add a second mutual row for either user.
    signedInAs("me");
    await callRoute(["friends", "unfollow"], { db: ctx.db, input: { userId: "alice" } });
    await callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "alice" } });
    for (const uid of ["me", "alice"]) {
      signedInAs(uid);
      const out = await callRoute<ListNotificationsOutput>(
        ["notifications", "list"],
        { db: ctx.db },
      );
      expect(out.items.filter((n) => n.kind === "mutual")).toHaveLength(1);
    }
  });

  it("follow refuses self-follow with VALIDATION", async () => {
    signedInAs("me");
    await expect(
      callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "me" } }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("follow 404s when the target is not a real user", async () => {
    signedInAs("me");
    await expect(
      callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "ghost" } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("follow is forbidden across a block (either direction)", async () => {
    await ctx.db.blocks.block("alice", "me"); // alice blocked me
    signedInAs("me");
    await expect(
      callRoute(["friends", "follow"], { db: ctx.db, input: { userId: "alice" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  /* ── unfollow ──────────────────────────────────────────────── */

  it("unfollow removes the edge", async () => {
    await ctx.db.follows.follow("me", "alice");
    signedInAs("me");
    const rel = await callRoute<FriendRelationship>(["friends", "unfollow"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(rel.following).toBe(false);
    expect(await ctx.db.follows.isFollowing("me", "alice")).toBe(false);
  });

  /* ── block / unblock ───────────────────────────────────────── */

  it("block severs follows in both directions and sets blocking", async () => {
    await ctx.db.follows.follow("me", "alice");
    await ctx.db.follows.follow("alice", "me");
    signedInAs("me");
    const rel = await callRoute<FriendRelationship>(["friends", "block"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(rel).toMatchObject({ blocking: true, following: false, followedBy: false });
    expect(await ctx.db.follows.isFollowing("me", "alice")).toBe(false);
    expect(await ctx.db.follows.isFollowing("alice", "me")).toBe(false);
  });

  it("block refuses self-block with VALIDATION", async () => {
    signedInAs("me");
    await expect(
      callRoute(["friends", "block"], { db: ctx.db, input: { userId: "me" } }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("unblock clears the block", async () => {
    await ctx.db.blocks.block("me", "alice");
    signedInAs("me");
    const rel = await callRoute<FriendRelationship>(["friends", "unblock"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(rel.blocking).toBe(false);
    expect(await ctx.db.blocks.isBlocked("me", "alice")).toBe(false);
  });

  /* ── relationship + stats ──────────────────────────────────── */

  it("relationship reports both directions and mutual", async () => {
    await ctx.db.follows.follow("me", "alice");
    await ctx.db.follows.follow("alice", "me");
    signedInAs("me");
    const rel = await callRoute<FriendRelationship>(["friends", "relationship"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(rel).toMatchObject({ following: true, followedBy: true, mutual: true });
  });

  it("stats counts followers, following, and friends for a user", async () => {
    // alice follows me + bob; me + bob follow alice back (so alice has
    // 2 friends), and bob also follows alice one extra (no dup).
    await ctx.db.follows.follow("alice", "me");
    await ctx.db.follows.follow("alice", "bob");
    await ctx.db.follows.follow("me", "alice");
    await ctx.db.follows.follow("bob", "alice");
    signedInAs("me");
    const stats = await callRoute<FriendStats>(["friends", "stats"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(stats).toMatchObject({
      userId: "alice",
      following: 2, // alice → me, alice → bob
      followers: 2, // me → alice, bob → alice
      friends: 2, // mutual with both
    });
  });

  /* ── lists ─────────────────────────────────────────────────── */

  it("listFollowing / listFollowers / listFriends resolve the right sets", async () => {
    await ctx.db.follows.follow("me", "alice"); // following alice
    await ctx.db.follows.follow("bob", "me"); // bob follows me
    await ctx.db.follows.follow("me", "bob"); // mutual with bob
    signedInAs("me");

    const following = await callRoute<FriendListOutput>(
      ["friends", "listFollowing"],
      { db: ctx.db },
    );
    expect(following.users.map((u) => u.userId).sort()).toEqual(["alice", "bob"]);

    const followers = await callRoute<FriendListOutput>(
      ["friends", "listFollowers"],
      { db: ctx.db },
    );
    expect(followers.users.map((u) => u.userId)).toEqual(["bob"]);

    const friends = await callRoute<FriendListOutput>(
      ["friends", "listFriends"],
      { db: ctx.db },
    );
    expect(friends.users.map((u) => u.userId)).toEqual(["bob"]);
    // Display info is resolved through Clerk.
    expect(friends.users[0]?.name).toBe("@Bob");
  });

  it("lists drop edges whose user Clerk can't resolve", async () => {
    await ctx.db.follows.follow("me", "alice");
    await ctx.db.follows.follow("me", "ghost"); // not a known Clerk user
    signedInAs("me");
    const following = await callRoute<FriendListOutput>(
      ["friends", "listFollowing"],
      { db: ctx.db },
    );
    expect(following.users.map((u) => u.userId)).toEqual(["alice"]);
  });
});
