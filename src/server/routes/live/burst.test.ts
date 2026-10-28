import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));
vi.mock("@/server/live-self-spectate", () => ({
  selfSpectateAllowed: vi.fn(() => false),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type { LiveProgressOutput, WatchOutput } from "@/types/live";

/** A BURST run's result figures ride on the broadcaster's `done` frame
 *  (`screen.burst`, src/types/live-burst.ts) so the spectator's clone
 *  shows the same results screen. These cover the trip through
 *  `live.progress` → store → `live.watch`, including the lean frames the
 *  server backfills and the lenient wire schema. */

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

const SNAP = {
  words: ["fire", "stone"],
  progressChars: 10,
  totalChars: 10,
  wpm: 90,
  accuracy: 97,
};

/** A done frame without the meta block, as the broadcaster sends on most
 *  pushes; the server backfills appearance/caret/theme from the last
 *  full frame. */
const LEAN_DONE = {
  phase: "done",
  typed: ["fire", "stone"],
  cursorWord: 2,
  cursorChar: 0,
  mode: "BURST",
  length: 2,
  quoteSource: null,
  elapsedMs: 4_000,
  raw: 80,
  wpmHistory: [],
  events: [],
};

const FULL_FRAME = {
  ...LEAN_DONE,
  phase: "running",
  appearance: { tapeMode: "off" },
  caret: { style: "block" },
  behaviour: { blindMode: false },
  themeVars: { "--primary": "oklch(0.6 0.2 30)" },
};

const BURST = {
  summary: {
    wpm: 187,
    raw: 160,
    best: 240,
    slowest: 120,
    consistency: 65,
    cleared: 3,
    tries: 4,
  },
  buckets: [
    { sec: 1, wpm: 150, raw: 140 },
    { sec: 2, wpm: 187, raw: 160 },
  ],
};

describe("live routes — burst results on the done frame", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });
  beforeEach(async () => {
    mockAuth.mockReset();
    mockClerkClient.mockReset();
    await ctx.reset();
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(async () => ({
          data: [{ id: "alice", username: "alice", firstName: "Alice" }],
          totalCount: 1,
        })),
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
    await ctx.db.follows.follow("me", "alice");
    await ctx.db.follows.follow("alice", "me");
  });
  afterAll(async () => {
    await ctx.close();
  });

  /** Alice pushes a full frame, then `done`; I watch. */
  async function pushThenWatch(done: Record<string, unknown>) {
    signedInAs("alice");
    await callRoute(["live", "progress"], {
      db: ctx.db,
      input: { ...SNAP, screen: FULL_FRAME },
    });
    const res = await callRoute<LiveProgressOutput>(["live", "progress"], {
      db: ctx.db,
      input: { ...SNAP, screen: done },
    });
    signedInAs("me");
    const w = await callRoute<WatchOutput>(["live", "watch"], {
      db: ctx.db,
      input: { userId: "alice" },
    });
    return { res, w };
  }

  it("a lean done frame keeps its burst block through the backfill", async () => {
    const { w } = await pushThenWatch({ ...LEAN_DONE, burst: BURST });
    expect(w.live).toBe(true);
    if (w.live) {
      expect(w.snapshot.screen?.phase).toBe("done");
      expect(w.snapshot.screen?.burst).toEqual(BURST);
      // The meta block was still backfilled around it.
      expect(w.snapshot.screen?.caret).toEqual({ style: "block" });
    }
  });

  it("an invalid burst block is dropped, not the push", async () => {
    const { res, w } = await pushThenWatch({
      ...LEAN_DONE,
      burst: { summary: { wpm: "fast" }, buckets: [] },
    });
    expect(res.accepted).toBe(true);
    expect(w.live).toBe(true);
    if (w.live) {
      expect(w.snapshot.screen?.phase).toBe("done");
      expect(w.snapshot.screen?.burst).toBeUndefined();
    }
  });

  it("an old client's done frame without the block still streams", async () => {
    const { w } = await pushThenWatch(LEAN_DONE);
    expect(w.live).toBe(true);
    if (w.live) expect(w.snapshot.screen?.burst).toBeUndefined();
  });
});
