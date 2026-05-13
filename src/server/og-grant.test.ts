import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import { logger } from "@/server/logger";
import { grantOg } from "./og-grant";

const mockClerkClient = vi.mocked(clerkClient);

function setupClient(opts: {
  publicMetadata?: Record<string, unknown>;
  getUserFails?: boolean;
}) {
  const getUser = opts.getUserFails
    ? vi.fn(async () => {
        throw new Error("clerk down");
      })
    : vi.fn(async () => ({
        id: "user_a",
        publicMetadata: opts.publicMetadata ?? {},
      }));
  const updateUserMetadata = vi.fn(async () => undefined);
  mockClerkClient.mockResolvedValue({
    users: { getUser, updateUserMetadata },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  return { getUser, updateUserMetadata };
}

describe("grantOg", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    if (!ctx) ctx = await createTestDatabase();
    await ctx.reset();
    mockClerkClient.mockReset();
  });

  it("writes og into Clerk publicMetadata and fires one notification", async () => {
    const { updateUserMetadata } = setupClient({ publicMetadata: {} });
    await grantOg({ db: ctx.db, log: logger }, "user_a", 42);
    expect(updateUserMetadata).toHaveBeenCalledTimes(1);
    const args = updateUserMetadata.mock.calls[0] as unknown as [
      string,
      { publicMetadata: { tags: string[] } },
    ];
    expect(args[0]).toBe("user_a");
    expect(args[1].publicMetadata.tags).toEqual(["og"]);
    const notifications = await ctx.db.notifications.listForUser("user_a");
    expect(notifications.length).toBe(1);
    expect(notifications[0]!.kind).toBe("og_granted");
  });

  it("preserves existing publicMetadata fields when merging tags", async () => {
    const { updateUserMetadata } = setupClient({
      publicMetadata: { role: "admin" },
    });
    await grantOg({ db: ctx.db, log: logger }, "user_a", 1);
    const args = updateUserMetadata.mock.calls[0] as unknown as [
      string,
      { publicMetadata: { role?: string; tags: string[] } },
    ];
    expect(args[1].publicMetadata.role).toBe("admin");
    expect(args[1].publicMetadata.tags).toEqual(["og"]);
  });

  it("skips Clerk write when og already present, still ensures the notification", async () => {
    const { updateUserMetadata } = setupClient({
      publicMetadata: { tags: ["og"] },
    });
    await grantOg({ db: ctx.db, log: logger }, "user_a", 100);
    expect(updateUserMetadata).not.toHaveBeenCalled();
    expect((await ctx.db.notifications.listForUser("user_a")).length).toBe(1);
  });

  it("dedupes the notification on a second grant call", async () => {
    setupClient({ publicMetadata: {} });
    await grantOg({ db: ctx.db, log: logger }, "user_a", 5);
    await grantOg({ db: ctx.db, log: logger }, "user_a", 5);
    expect(await ctx.db.notifications.unreadCountForUser("user_a")).toBe(1);
  });

  it("swallows Clerk errors — never throws", async () => {
    setupClient({ getUserFails: true });
    await expect(
      grantOg({ db: ctx.db, log: logger }, "user_a", 1),
    ).resolves.toBeUndefined();
    expect(await ctx.db.notifications.unreadCountForUser("user_a")).toBe(0);
  });
});
