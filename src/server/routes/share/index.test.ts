import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
  clerkClient: vi.fn(),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { createTestDatabase } from "@/db/server/testing";
import { BackendError } from "@/lib/errors";
import { _resetClerkUserCache } from "@/server/clerk-user-cache";
import { callRoute } from "@/server/testing";
import type { NewTestRow } from "@/types/adapt";
import type { SharedTest } from "@/types/share";

const mockClerkClient = vi.mocked(clerkClient);

const SHARE_ID = "a3f9c0d12b4e4f1a9c8d0123456789ab";
const SHARE_SLUG = `alice-124wpm-${SHARE_ID.slice(0, 8)}`;

function row(over: Partial<NewTestRow> = {}): NewTestRow {
  return {
    id: SHARE_ID,
    userId: "u1",
    startedAt: new Date(2026, 4, 1, 12, 0, 0),
    completedAt: new Date(2026, 4, 1, 12, 0, 34),
    mode: "training",
    durationOrWordCount: 50,
    wpm: 124,
    accuracy: 98,
    errorCount: 1,
    resetCount: 0,
    wasCompleted: true,
    ...over,
  };
}

function mockClerkUser(over: {
  id?: string;
  firstName?: string | null;
  username?: string | null;
  hasImage?: boolean;
  imageUrl?: string;
  email?: string | null;
} = {}) {
  mockClerkClient.mockResolvedValue({
    users: {
      getUser: vi.fn(async () => ({
        id: over.id ?? "u1",
        firstName: over.firstName ?? "alice",
        username: over.username ?? "alice",
        hasImage: over.hasImage ?? true,
        imageUrl: over.imageUrl ?? "https://example.com/a.png",
        emailAddresses: over.email
          ? [{ emailAddress: over.email }]
          : [],
        publicMetadata: {},
      })),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

describe("share.get", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    await ctx.reset();
    mockClerkClient.mockReset();
    mockClerkUser();
    _resetClerkUserCache();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("resolves a friendly slug to the run + joins handle + avatar", async () => {
    await ctx.db.tests.insert(row());
    const res = await callRoute<SharedTest>(["share", "get"], {
      input: { slug: SHARE_SLUG },
      db: ctx.db,
    });
    expect(res.testId).toBe(SHARE_ID);
    expect(res.wpm).toBe(124);
    expect(res.handle).toBe("@alice");
    expect(res.avatarUrl).toBe("https://example.com/a.png");
    expect(res.durationSec).toBe(34);
  });

  it("also resolves a bare full UUID for legacy share links", async () => {
    await ctx.db.tests.insert(row());
    const res = await callRoute<SharedTest>(["share", "get"], {
      input: { slug: SHARE_ID },
      db: ctx.db,
    });
    expect(res.testId).toBe(SHARE_ID);
  });

  it("falls back to @racer + null avatar when Clerk lookup fails", async () => {
    mockClerkClient.mockRejectedValue(new Error("clerk-down"));
    await ctx.db.tests.insert(row());
    const res = await callRoute<SharedTest>(["share", "get"], {
      input: { slug: SHARE_SLUG },
      db: ctx.db,
    });
    expect(res.handle).toBe("@racer");
    expect(res.avatarUrl).toBeNull();
  });

  it("omits avatar when the user has no uploaded image", async () => {
    mockClerkUser({ hasImage: false });
    await ctx.db.tests.insert(row());
    const res = await callRoute<SharedTest>(["share", "get"], {
      input: { slug: SHARE_SLUG },
      db: ctx.db,
    });
    expect(res.avatarUrl).toBeNull();
  });

  it("404s when the slug's trailing hex matches nothing", async () => {
    await expect(
      callRoute<SharedTest>(["share", "get"], {
        input: { slug: "ghost-92wpm-deadbeef" },
        db: ctx.db,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("404s when the slug tail isn't hex (guards against bare-LIKE scans)", async () => {
    await expect(
      callRoute<SharedTest>(["share", "get"], {
        input: { slug: "saif-92wpm-notahexid" },
        db: ctx.db,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("404s when the test is incomplete", async () => {
    await ctx.db.tests.insert(row({ wasCompleted: false }));
    await expect(
      callRoute<SharedTest>(["share", "get"], {
        input: { slug: SHARE_SLUG },
        db: ctx.db,
      }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("rejects an empty slug via Zod validation", async () => {
    await expect(
      callRoute<SharedTest>(["share", "get"], {
        input: { slug: "" },
        db: ctx.db,
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
