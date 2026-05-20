import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

function duelInput(over: Partial<Parameters<typeof base>[0]> = {}) {
  return { ...base({}), ...over };
}
function base(over: Record<string, unknown>) {
  return {
    id: "d1",
    challengerId: "alice",
    opponentId: "bob",
    words: ["the", "quick", "brown"],
    mode: "casual",
    durationOrWordCount: 25,
    challengerWpm: 120,
    challengerAccuracy: 97,
    challengerWpmHistory: [40, 80, 120],
    ...over,
  };
}

describe("duelsRepo", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });
  beforeEach(async () => {
    await ctx.reset();
  });
  afterAll(async () => {
    await ctx.close();
  });

  it("create + findById round-trips the snapshot", async () => {
    await ctx.db.duels.create(duelInput());
    const d = await ctx.db.duels.findById("d1");
    expect(d?.challengerId).toBe("alice");
    expect(d?.opponentId).toBe("bob");
    expect(d?.words).toEqual(["the", "quick", "brown"]);
    expect(d?.status).toBe("pending");
    expect(d?.challengerWpm).toBe(120);
    expect(d?.challengerWpmHistory).toEqual([40, 80, 120]);
  });

  it("listIncoming / listOutgoing read the right side", async () => {
    await ctx.db.duels.create(duelInput({ id: "d1", challengerId: "alice", opponentId: "bob" }));
    await ctx.db.duels.create(duelInput({ id: "d2", challengerId: "carol", opponentId: "bob" }));
    await ctx.db.duels.create(duelInput({ id: "d3", challengerId: "bob", opponentId: "alice" }));

    const incoming = await ctx.db.duels.listIncoming("bob");
    expect(incoming.map((d) => d.id).sort()).toEqual(["d1", "d2"]);

    const outgoing = await ctx.db.duels.listOutgoing("bob");
    expect(outgoing.map((d) => d.id)).toEqual(["d3"]);
  });

  it("recordResult completes a pending duel for the opponent", async () => {
    await ctx.db.duels.create(duelInput());
    const updated = await ctx.db.duels.recordResult({
      id: "d1",
      opponentId: "bob",
      wpm: 130,
      accuracy: 99,
    });
    expect(updated?.status).toBe("completed");
    expect(updated?.opponentWpm).toBe(130);
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });

  it("recordResult refuses a non-opponent and an already-completed duel", async () => {
    await ctx.db.duels.create(duelInput());
    // Wrong user can't record.
    expect(
      await ctx.db.duels.recordResult({ id: "d1", opponentId: "carol", wpm: 1, accuracy: 1 }),
    ).toBeNull();
    // Real opponent completes it.
    await ctx.db.duels.recordResult({ id: "d1", opponentId: "bob", wpm: 130, accuracy: 99 });
    // Second attempt finds nothing pending.
    expect(
      await ctx.db.duels.recordResult({ id: "d1", opponentId: "bob", wpm: 200, accuracy: 100 }),
    ).toBeNull();
    const d = await ctx.db.duels.findById("d1");
    expect(d?.opponentWpm).toBe(130); // unchanged by the second attempt
  });
});
