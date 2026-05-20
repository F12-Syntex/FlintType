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
  CreateDuelOutput,
  GetDuelOutput,
  ListDuelsOutput,
  SubmitDuelResultOutput,
} from "@/types/duel";
import type { ListNotificationsOutput } from "@/types/notification";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  emailAddresses?: { emailAddress: string }[];
};

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

const RUN = {
  words: ["the", "quick", "brown", "fox"],
  mode: "casual",
  durationOrWordCount: 25,
  wpm: 100,
  accuracy: 96,
  wpmHistory: [40, 70, 100],
};

/** Make me <-> alice mutual friends. */
async function befriend(ctx: Awaited<ReturnType<typeof createTestDatabase>>) {
  await ctx.db.follows.follow("me", "alice");
  await ctx.db.follows.follow("alice", "me");
}

describe("duels routes", () => {
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
      callRoute(["duels", "create"], { db: ctx.db, input: { opponentId: "alice", ...RUN } }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("rejects invalid input with a ZodError", async () => {
    signedInAs("me");
    await expect(
      callRoute(["duels", "create"], { db: ctx.db, input: { opponentId: "alice" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("create requires a mutual friend (403 for a non-friend, 400 for self)", async () => {
    signedInAs("me");
    // bob is not a friend.
    await expect(
      callRoute(["duels", "create"], { db: ctx.db, input: { opponentId: "bob", ...RUN } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      callRoute(["duels", "create"], { db: ctx.db, input: { opponentId: "me", ...RUN } }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("create snapshots the run and notifies the opponent", async () => {
    await befriend(ctx);
    signedInAs("me");
    const { id } = await callRoute<CreateDuelOutput>(["duels", "create"], {
      db: ctx.db,
      input: { opponentId: "alice", ...RUN },
    });
    expect(id).toBeTruthy();
    const row = await ctx.db.duels.findById(id);
    expect(row?.words).toEqual(RUN.words);
    expect(row?.challengerWpm).toBe(100);
    // Alice received a duel_challenge.
    signedInAs("alice");
    const feed = await callRoute<ListNotificationsOutput>(["notifications", "list"], { db: ctx.db });
    expect(feed.items.some((n) => n.kind === "duel_challenge")).toBe(true);
  });

  it("get is restricted to the two participants", async () => {
    await befriend(ctx);
    signedInAs("me");
    const { id } = await callRoute<CreateDuelOutput>(["duels", "create"], {
      db: ctx.db,
      input: { opponentId: "alice", ...RUN },
    });
    // Opponent can read it (and gets the passage to type).
    signedInAs("alice");
    const duel = await callRoute<GetDuelOutput>(["duels", "get"], {
      db: ctx.db,
      input: { id },
    });
    expect(duel.words).toEqual(RUN.words);
    expect(duel.challenger.name).toBe("@Me");
    // A third party can't.
    signedInAs("bob");
    await expect(
      callRoute(["duels", "get"], { db: ctx.db, input: { id } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("submitResult records the opponent's run, computes win, notifies challenger", async () => {
    await befriend(ctx);
    signedInAs("me");
    const { id } = await callRoute<CreateDuelOutput>(["duels", "create"], {
      db: ctx.db,
      input: { opponentId: "alice", ...RUN }, // challenger net = 100*0.96 = 96
    });
    signedInAs("alice");
    const done = await callRoute<SubmitDuelResultOutput>(["duels", "submitResult"], {
      db: ctx.db,
      input: { id, wpm: 130, accuracy: 99 }, // net = 128.7 > 96 → won
    });
    expect(done.status).toBe("completed");
    expect(done.opponentWpm).toBe(130);
    // Challenger (me) got a duel_result saying their run was beaten.
    signedInAs("me");
    const feed = await callRoute<ListNotificationsOutput>(["notifications", "list"], { db: ctx.db });
    const result = feed.items.find((n) => n.kind === "duel_result");
    expect(result).toBeTruthy();
    expect((result?.data as { won: boolean }).won).toBe(true);
  });

  it("submitResult refuses a non-opponent (403) and unknown duel (404)", async () => {
    await befriend(ctx);
    signedInAs("me");
    const { id } = await callRoute<CreateDuelOutput>(["duels", "create"], {
      db: ctx.db,
      input: { opponentId: "alice", ...RUN },
    });
    // The challenger isn't the opponent.
    signedInAs("me");
    await expect(
      callRoute(["duels", "submitResult"], { db: ctx.db, input: { id, wpm: 1, accuracy: 1 } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    signedInAs("alice");
    await expect(
      callRoute(["duels", "submitResult"], { db: ctx.db, input: { id: "nope", wpm: 1, accuracy: 1 } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("list splits incoming vs outgoing for the caller", async () => {
    await befriend(ctx);
    // me → alice (outgoing for me); alice → me (incoming for me).
    signedInAs("me");
    await callRoute(["duels", "create"], { db: ctx.db, input: { opponentId: "alice", ...RUN } });
    signedInAs("alice");
    await callRoute(["duels", "create"], { db: ctx.db, input: { opponentId: "me", ...RUN } });

    signedInAs("me");
    const out = await callRoute<ListDuelsOutput>(["duels", "list"], { db: ctx.db });
    expect(out.outgoing).toHaveLength(1);
    expect(out.outgoing[0]?.opponent.userId).toBe("alice");
    expect(out.incoming).toHaveLength(1);
    expect(out.incoming[0]?.challenger.userId).toBe("alice");
  });
});
