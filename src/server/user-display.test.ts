import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import { resolveUserDisplays } from "@/server/user-display";

const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  emailAddresses?: { emailAddress: string }[];
  publicMetadata?: Record<string, unknown> | null;
};

function mockUsers(users: ClerkUserLike[]) {
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async () => ({ data: users, totalCount: users.length })),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

describe("resolveUserDisplays", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    mockClerkClient.mockReset();
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
});
