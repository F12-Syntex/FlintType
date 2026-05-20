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

// Default off so the suite exercises the real prod self-deny; individual
// dev-bypass tests flip it on.
vi.mock("@/server/live-self-spectate", () => ({
  selfSpectateAllowed: vi.fn(() => false),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { selfSpectateAllowed } from "@/server/live-self-spectate";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  FriendsLiveOutput,
  LiveProgressOutput,
  SpectatorsOutput,
  StopLiveOutput,
  WatchOutput,
} from "@/types/live";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);
const mockSelfSpectate = vi.mocked(selfSpectateAllowed);

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

const SCREEN = {
  typed: ["the", "qu"],
  cursorWord: 1,
  cursorChar: 2,
  mode: "WORDS",
  quoteSource: null,
  elapsedMs: 5_000,
  raw: 95,
  appearance: { tapeMode: "off" },
  caret: { style: "block" },
  behaviour: { blindMode: false },
  themeVars: { "--primary": "oklch(0.6 0.2 30)" },
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
    mockSelfSpectate.mockReturnValue(false);
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

  it("progress is accepted by default (sharing on), rejected only when explicitly off", async () => {
    signedInAs("alice");
    // No pref set → sharing on by default → accepted.
    expect(
      (
        await callRoute<LiveProgressOutput>(["live", "progress"], {
          db: ctx.db,
          input: SNAP,
        })
      ).accepted,
    ).toBe(true);
    // Explicitly turned off → rejected.
    await ctx.db.userPrefs.merge("alice", { spectate: { enabled: false } });
    expect(
      (
        await callRoute<LiveProgressOutput>(["live", "progress"], {
          db: ctx.db,
          input: SNAP,
        })
      ).accepted,
    ).toBe(false);
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

  it("friendsLive includes live mutual friends by default; excludes non-friends", async () => {
    await befriend(ctx); // me <-> alice (no spectate pref → on by default)
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });

    // bob is live + opted in but only a one-way follow (not mutual).
    await ctx.db.follows.follow("me", "bob");
    signedInAs("bob");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });

    signedInAs("me");
    const out = await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
      db: ctx.db,
    });
    expect(out.users.map((u) => u.userId)).toEqual(["alice"]);
  });

  it("friendsLive drops a friend who turned sharing off or denied me", async () => {
    await befriend(ctx); // me <-> alice
    // alice is live (default on), then denies me specifically.
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    await ctx.db.userPrefs.merge("alice", { spectate: { blocked: ["me"] } });
    signedInAs("me");
    expect(
      (
        await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
          db: ctx.db,
        })
      ).users,
    ).toHaveLength(0);
  });

  it("a per-friend denylist blocks watch even between mutual friends", async () => {
    await befriend(ctx);
    await ctx.db.userPrefs.merge("alice", { spectate: { blocked: ["me"] } });
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    signedInAs("me");
    expect(
      (
        await callRoute<WatchOutput>(["live", "watch"], {
          db: ctx.db,
          input: { userId: "alice" },
        })
      ).live,
    ).toBe(false);
  });

  it("spectators lists the fresh watchers of a broadcaster", async () => {
    await befriend(ctx); // me <-> alice
    signedInAs("alice");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    // me watches alice → records me as alice's spectator.
    signedInAs("me");
    const w = await callRoute<WatchOutput>(["live", "watch"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(w.live).toBe(true);
    // alice sees who's watching.
    signedInAs("alice");
    const s = await callRoute<SpectatorsOutput>(["live", "spectators"], {
      db: ctx.db,
    });
    expect(s.watchers).toHaveLength(1);
    expect(s.watchers[0].userId).toBe("me");
    expect(s.watchers[0].name).toBe("@Me");
  });

  it("friendsLive is empty when the caller has no friends", async () => {
    signedInAs("me");
    const out = await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
      db: ctx.db,
    });
    expect(out.users).toEqual([]);
  });

  it("dev self-spectate: a user can watch their own opted-in live session", async () => {
    mockSelfSpectate.mockReturnValue(true);
    await ctx.db.userPrefs.merge("me", { spectate: { enabled: true } });
    signedInAs("me");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    const w = await callRoute<WatchOutput>(["live", "watch"], {
      db: ctx.db,
      input: { userId: "me" },
    });
    expect(w.live).toBe(true);
    if (w.live) expect(w.subject.userId).toBe("me");
  });

  it("dev self-spectate: friendsLive surfaces yourself when live + opted in", async () => {
    mockSelfSpectate.mockReturnValue(true);
    await ctx.db.userPrefs.merge("me", { spectate: { enabled: true } });
    signedInAs("me");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    const out = await callRoute<FriendsLiveOutput>(["live", "friendsLive"], {
      db: ctx.db,
    });
    expect(out.users.map((u) => u.userId)).toContain("me");
  });

  it("self-spectate stays denied when the dev bypass is off", async () => {
    // mockSelfSpectate defaults to false in beforeEach.
    await ctx.db.userPrefs.merge("me", { spectate: { enabled: true } });
    signedInAs("me");
    await callRoute(["live", "progress"], { db: ctx.db, input: SNAP });
    const w = await callRoute<WatchOutput>(["live", "watch"], {
      db: ctx.db,
      input: { userId: "me" },
    });
    expect(w.live).toBe(false);
  });

  it("watch round-trips the screen clone payload when present", async () => {
    await befriend(ctx);
    signedInAs("alice");
    await callRoute(["live", "progress"], {
      db: ctx.db,
      input: { ...SNAP, screen: SCREEN },
    });
    signedInAs("me");
    const w = await callRoute<WatchOutput>(["live", "watch"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    expect(w.live).toBe(true);
    if (w.live) {
      expect(w.snapshot.screen?.cursorWord).toBe(1);
      expect(w.snapshot.screen?.typed).toEqual(["the", "qu"]);
      expect(w.snapshot.screen?.caret).toEqual({ style: "block" });
      expect(w.snapshot.screen?.themeVars["--primary"]).toBe(
        "oklch(0.6 0.2 30)",
      );
    }
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
