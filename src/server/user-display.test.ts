import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import {
  _resetUserDisplayCache,
  invalidateUserDisplay,
  resolveUserDisplays,
} from "@/server/user-display";

const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  emailAddresses?: { emailAddress: string }[];
  publicMetadata?: Record<string, unknown> | null;
  imageUrl?: string | null;
};

/** Returns the per-test `getUserList` spy so a test can assert how many
 *  times Clerk was actually hit (the cache should suppress repeats). */
function mockUsers(users: ClerkUserLike[]) {
  const getUserList = vi.fn(async () => ({
    data: users,
    totalCount: users.length,
  }));
  mockClerkClient.mockResolvedValue({
    users: { getUserList },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  return getUserList;
}

describe("resolveUserDisplays", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    mockClerkClient.mockReset();
    // Module-level display cache persists across tests — clear it so
    // ids reused between cases re-resolve against the current mock.
    _resetUserDisplayCache();
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("returns an empty map for no ids without hitting Clerk", async () => {
    const out = await resolveUserDisplays(ctx.db, []);
    expect(out.size).toBe(0);
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("builds @handle via the firstName → username → email fallback chain", async () => {
    mockUsers([
      { id: "u1", firstName: "Ada", username: "ada99" },
      { id: "u2", firstName: null, username: "bytes" },
      { id: "u3", firstName: null, username: null, emailAddresses: [{ emailAddress: "carol@x.io" }] },
    ]);
    const out = await resolveUserDisplays(ctx.db, ["u1", "u2", "u3"]);
    expect(out.get("u1")?.name).toBe("@Ada");
    expect(out.get("u2")?.name).toBe("@bytes");
    expect(out.get("u3")?.name).toBe("@carol");
    expect(out.get("u1")?.username).toBe("ada99");
  });

  it("passes the Clerk avatar through, null when absent", async () => {
    mockUsers([
      { id: "u1", username: "ada", imageUrl: "https://img.clerk/ada.png" },
      { id: "u2", username: "bo" },
    ]);
    const out = await resolveUserDisplays(ctx.db, ["u1", "u2"]);
    expect(out.get("u1")?.imageUrl).toBe("https://img.clerk/ada.png");
    expect(out.get("u2")?.imageUrl).toBeNull();
  });

  it("omits ids Clerk can't resolve", async () => {
    mockUsers([{ id: "u1", username: "ada" }]);
    const out = await resolveUserDisplays(ctx.db, ["u1", "ghost"]);
    expect(out.has("u1")).toBe(true);
    expect(out.has("ghost")).toBe(false);
  });

  it("honours the stored tag-display selection (explicit opt-out hides eligible tags)", async () => {
    // og is eligible via publicMetadata.tags; an explicit empty selection hides it.
    await ctx.db.userPrefs.merge("u1", { selectedTags: [] });
    mockUsers([{ id: "u1", username: "ada", publicMetadata: { tags: ["og"] } }]);
    const out = await resolveUserDisplays(ctx.db, ["u1"]);
    expect(out.get("u1")?.tags).toEqual([]);
  });

  it("surfaces eligible tags when no selection is stored", async () => {
    mockUsers([{ id: "u1", username: "ada", publicMetadata: { tags: ["og"] } }]);
    const out = await resolveUserDisplays(ctx.db, ["u1"]);
    expect(out.get("u1")?.tags).toEqual(["og"]);
  });

  it("pages the Clerk lookup into ≤500-id chunks past the limit (FT-065)", async () => {
    // Echo back exactly the requested page so we can assert every id
    // resolves across the chunks.
    const getUserList = vi.fn(
      async (args: { userId: string[]; limit: number }) => ({
        data: args.userId.map((id) => ({ id, username: id })),
        totalCount: args.userId.length,
      }),
    );
    mockClerkClient.mockResolvedValue({
      users: { getUserList },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);

    const ids = Array.from({ length: 1100 }, (_, i) => `u${i}`);
    const out = await resolveUserDisplays(ctx.db, ids);

    // 1100 ids → 3 pages (500 + 500 + 100); none may exceed Clerk's cap.
    expect(getUserList).toHaveBeenCalledTimes(3);
    for (const call of getUserList.mock.calls) {
      const arg = call[0] as { userId: string[]; limit: number };
      expect(arg.userId.length).toBeLessThanOrEqual(500);
      expect(arg.limit).toBeLessThanOrEqual(500);
    }
    // Every id resolved across the pages — nothing silently dropped.
    expect(out.size).toBe(1100);
    expect(out.get("u0")?.username).toBe("u0");
    expect(out.get("u1099")?.username).toBe("u1099");
  });

  it("serves a repeated resolve from cache without hitting Clerk again", async () => {
    const getUserList = mockUsers([{ id: "u1", username: "ada" }]);
    const first = await resolveUserDisplays(ctx.db, ["u1"]);
    const second = await resolveUserDisplays(ctx.db, ["u1"]);
    expect(first.get("u1")?.name).toBe("@ada");
    expect(second.get("u1")?.name).toBe("@ada");
    // The hot poll path must not re-fetch a user it just resolved.
    expect(getUserList).toHaveBeenCalledTimes(1);
  });

  it("only fetches the cache misses in a partially-warm batch", async () => {
    const warm = mockUsers([{ id: "u1", username: "ada" }]);
    await resolveUserDisplays(ctx.db, ["u1"]);
    expect(warm).toHaveBeenCalledTimes(1);
    // u1 is now warm; a batch of {u1, u2} should fetch only u2.
    const second = mockUsers([{ id: "u2", username: "bo" }]);
    const out = await resolveUserDisplays(ctx.db, ["u1", "u2"]);
    expect(out.get("u1")?.name).toBe("@ada");
    expect(out.get("u2")?.name).toBe("@bo");
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith({ userId: ["u2"], limit: 1 });
  });

  it("does not hit Clerk at all when every id is warm", async () => {
    mockUsers([{ id: "u1", username: "ada" }]);
    await resolveUserDisplays(ctx.db, ["u1"]);
    const cold = mockUsers([]);
    await resolveUserDisplays(ctx.db, ["u1"]);
    expect(cold).not.toHaveBeenCalled();
  });

  it("re-fetches after invalidation (e.g. a username / tag change)", async () => {
    mockUsers([{ id: "u1", firstName: "Ada", username: "ada" }]);
    const before = await resolveUserDisplays(ctx.db, ["u1"]);
    expect(before.get("u1")?.name).toBe("@Ada");

    invalidateUserDisplay("u1");
    const fresh = mockUsers([{ id: "u1", firstName: "Adaline", username: "ada" }]);
    const after = await resolveUserDisplays(ctx.db, ["u1"]);
    expect(after.get("u1")?.name).toBe("@Adaline");
    expect(fresh).toHaveBeenCalledTimes(1);
  });

  it("does not cache an unresolved id (retries it next call)", async () => {
    mockUsers([{ id: "u1", username: "ada" }]);
    await resolveUserDisplays(ctx.db, ["u1", "ghost"]);
    // ghost wasn't in Clerk's response, so it must be retried — a second
    // call still includes it in the fetch set.
    const retry = mockUsers([{ id: "ghost", username: "back" }]);
    const out = await resolveUserDisplays(ctx.db, ["u1", "ghost"]);
    expect(retry).toHaveBeenCalledWith({ userId: ["ghost"], limit: 1 });
    expect(out.get("ghost")?.name).toBe("@back");
  });
});
