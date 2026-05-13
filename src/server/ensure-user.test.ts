import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@/lib/errors";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import { logger } from "@/server/logger";
import { ensureUser } from "./ensure-user";
import { OG_MILESTONE_LIMIT } from "@/db/server/repositories/users";

const mockClerkClient = vi.mocked(clerkClient);

function setupClientOk(metadata: Record<string, unknown> = {}) {
  mockClerkClient.mockResolvedValue({
    users: {
      getUser: vi.fn(async () => ({ id: "user_a", publicMetadata: metadata })),
      updateUserMetadata: vi.fn(async () => undefined),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

describe("ensureUser", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    if (!ctx) ctx = await createTestDatabase();
    await ctx.reset();
    mockClerkClient.mockReset();
  });

  it("throws INTERNAL when meta.userId is missing", async () => {
    await expect(
      ensureUser({ meta: {}, db: ctx.db, log: logger }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("materialises a fresh row and grants OG when seq is within the milestone", async () => {
    setupClientOk();
    const row = await ensureUser({
      meta: { userId: "user_a" },
      db: ctx.db,
      log: logger,
    });
    expect(row).not.toBeNull();
    expect(row!.id).toBe("user_a");
    expect(row!.seq).toBe(1);
    const list = await ctx.db.notifications.listForUser("user_a");
    expect(list.length).toBe(1);
    expect(list[0]!.kind).toBe("og_granted");
  });

  it("is idempotent — second call returns the same row without re-granting", async () => {
    setupClientOk();
    const first = await ensureUser({
      meta: { userId: "user_a" },
      db: ctx.db,
      log: logger,
    });
    const second = await ensureUser({
      meta: { userId: "user_a" },
      db: ctx.db,
      log: logger,
    });
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.id).toBe(first!.id);
    expect(second!.seq).toBe(first!.seq);
    // Only one notification — the second call sees created=false and
    // never enters the grant branch.
    expect((await ctx.db.notifications.listForUser("user_a")).length).toBe(1);
  });

  it("returns null and does not throw when the mirror is unavailable", async () => {
    setupClientOk();
    const brokenDb = {
      ...ctx.db,
      users: {
        ...ctx.db.users,
        ensureForUser: vi.fn(async () => {
          throw new Error('relation "users" does not exist');
        }),
      },
    };
    const result = await ensureUser({
      meta: { userId: "user_a" },
      db: brokenDb,
      log: logger,
    });
    expect(result).toBeNull();
    // And critically — no notifications were created (the grant
    // pipeline never even started).
    expect((await ctx.db.notifications.listForUser("user_a")).length).toBe(0);
  });

  it("does not grant OG past the milestone", async () => {
    setupClientOk();
    // Pre-fill the table with a dummy row using the raw drizzle handle
    // so the next ensureUser lands at seq > MILESTONE.
    const drizzle = ctx.db.$drizzle;
    const { users } = await import("@/db/schema/server/users");
    const seedRows = Array.from({ length: OG_MILESTONE_LIMIT }, (_, i) => ({
      id: `seed_${i + 1}`,
    }));
    await drizzle.insert(users).values(seedRows);
    const row = await ensureUser({
      meta: { userId: "user_late" },
      db: ctx.db,
      log: logger,
    });
    expect(row).not.toBeNull();
    expect(row!.seq).toBeGreaterThan(OG_MILESTONE_LIMIT);
    expect((await ctx.db.notifications.listForUser("user_late")).length).toBe(0);
  });
});
