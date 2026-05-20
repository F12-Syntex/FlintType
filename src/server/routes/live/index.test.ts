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
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  FriendsLiveOutput,
  LiveProgressOutput,
  StopLiveOutput,
  WatchOutput,
} from "@/types/live";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

function mockKnownUsers(
  known: {
    id: string;
    username?: string;
    firstName?: string;
    imageUrl?: string;
  }[],
) {
  const byId = new Map(known.map((u) => [u.id, u]));
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async (args?: { userId?: string[] }) => {
        const ids = args?.userId ?? [...byId.keys()];
        const data = ids.map((id) => byId.get(id)).filter(Boolean);
        return { data, totalCount: data.length };
      }),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

const SNAP = {
  words: ["the", "quick", "brown"],
  progressChars: 5,
  totalChars: 15,
  wpm: 90,
  accuracy: 97,
};

async function befriend(ctx: Awaited<ReturnType<typeof createTestDatabase>>) {
  await ctx.db.follows.follow("me", "alice");
  await ctx.db.follows.follow("alice", "me");
}

describe("live routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });
  beforeEach(async () => {
    mockAuth.mockReset();
    mockClerkClient.mockReset();
    await ctx.reset();
    mockKnownUsers([
      { id: "me", username: "me_handle", firstName: "Me" },
      {
        id: "alice",
        username: "alice",
        firstName: "Alice",
        imageUrl: "https://img.clerk/alice.png",
      },
      { id: "bob", username: "bob", firstName: "Bob" },
    ]);
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
      callRoute(["live", "progress"], { db: ctx.db, input: SNAP }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("progress is rejected unless the user opted in to being spectated", async () => {
    signedInAs("alice");
    const out = await callRoute<LiveProgressOutput>(["live", "progress"], {
      db: ctx.db,
      input: SNAP,
    });
    expect(out.accepted).toBe(false);
  });

  it("a mutual friend can watch an opted-in, currently-live user", async () => {
    await befriend(ctx);
    await ctx.db.userPrefs.merge("alice", { spectate: { enabled: true } });
    signedInAs("alice");
    const pushed = await callRoute<LiveProgressOutput>(["live", "progress"], {
      db: ctx.db,
      input: SNAP,
    });
    expect(pushed.accepted).toBe(true);

    signedInAs("me");
    const w = await callRoute<WatchOutput>(["live", "watch"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(w.live).toBe(true);
    if (w.live) {
      expect(w.subject.name).toBe("@Alice");
      expect(w.subject.imageUrl).toBe("https://img.clerk/alice.png");
      expect(w.snapshot.wpm).toBe(90);
      expect(w.snapshot.progressChars).toBe(5);
    }
  });

  it("watch is denied for non-mutual, blocked, not-opted-in, and self", async () => {
    await ctx.db.userPrefs.merge("alice", { spectate: { enabled: true } });
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    signedInAs("me");

    // Not mutual (me doesn't follow alice both ways).
    expect((await callRoute<WatchOutput>(["live", "watch"], { db: ctx.db, input: { userId: "alice" } })).live).toBe(false);

    // Make mutual, then block — still denied.
    await befriend(ctx);
    await ctx.db.blocks.block("me", "alice");
    expect((await callRoute<WatchOutput>(["live", "watch"], { db: ctx.db, input: { userId: "alice" } })).live).toBe(false);
    await ctx.db.blocks.unblock("me", "alice");

    // Mutual + unblocked but target opts out → denied.
    await ctx.db.userPrefs.merge("alice", { spectate: { enabled: false } });
    expect((await callRoute<WatchOutput>(["live", "watch"], { db: ctx.db, input: { userId: "alice" } })).live).toBe(false);

    // Self → denied.
    expect((await callRoute<WatchOutput>(["live", "watch"], { db: ctx.db, input: { userId: "me" } })).live).toBe(false);
  });

  it("friendsLive returns mutual friends who are opted in and currently live", async () => {
    await befriend(ctx); // me <-> alice mutual
    await ctx.db.userPrefs.merge("alice", { spectate: { enabled: true } });
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });

    signedInAs("me");
    const out = await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
      db: ctx.db,
    });
    expect(out.users).toHaveLength(1);
    const u = out.users[0];
    expect(u.userId).toBe("alice");
    expect(u.name).toBe("@Alice");
    expect(u.imageUrl).toBe("https://img.clerk/alice.png");
    expect(u.wpm).toBe(90);
    expect(u.progressChars).toBe(5);
    expect(u.totalChars).toBe(15);
  });

  it("friendsLive excludes friends who haven't opted in, and non-friends", async () => {
    await befriend(ctx); // me <-> alice
    // alice is live but did NOT opt in.
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });

    // bob opted in + live but is only a one-way follow (not mutual).
    await ctx.db.follows.follow("me", "bob");
    await ctx.db.userPrefs.merge("bob", { spectate: { enabled: true } });
    signedInAs("bob");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });

    signedInAs("me");
    const out = await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
      db: ctx.db,
    });
    expect(out.users).toHaveLength(0);
  });

  it("friendsLive is empty when the caller has no friends", async () => {
    signedInAs("me");
    const out = await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
      db: ctx.db,
    });
    expect(out.users).toEqual([]);
  });

  it("stop clears the broadcaster's live snapshot", async () => {
    await befriend(ctx);
    await ctx.db.userPrefs.merge("alice", { spectate: { enabled: true } });
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    const stopped = await callRoute<StopLiveOutput>(["live", "stop"], { db: ctx.db });
    expect(stopped.ok).toBe(true);
    signedInAs("me");
    expect((await callRoute<WatchOutput>(["live", "watch"], { db: ctx.db, input: { userId: "alice" } })).live).toBe(false);
  });
});
