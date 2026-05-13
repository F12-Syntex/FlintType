import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { OWNER_EMAILS } from "@/server/owner-config";
import { callRoute } from "@/server/testing";
import type { BackfillOgOutput } from "./index";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = {
  id: string;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: Record<string, unknown>;
};

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

/** Mock Clerk to return the supplied roster on getUser + getUserList.
 *  getUserList is paginated — we honour offset/limit so the route's
 *  pagination loop terminates correctly. */
function mockClerk(roster: ClerkUserLike[]) {
  const getUser = vi.fn(async (id: string) => {
    const u = roster.find((r) => r.id === id);
    if (!u) throw new Error(`unknown user ${id}`);
    return u;
  });
  const getUserList = vi.fn(
    async ({ limit, offset }: { limit?: number; offset?: number }) => {
      const lim = limit ?? 100;
      const off = offset ?? 0;
      const data = roster.slice(off, off + lim);
      return { data, totalCount: roster.length };
    },
  );
  const updateUserMetadata = vi.fn(async () => undefined);
  mockClerkClient.mockResolvedValue({
    users: { getUser, getUserList, updateUserMetadata },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
}

describe("admin.backfillOg", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    if (!ctx) ctx = await createTestDatabase();
    await ctx.reset();
    mockAuth.mockReset();
    mockClerkClient.mockReset();
  });

  it("rejects callers whose email isn't in OWNER_EMAILS", async () => {
    signedInAs("user_stranger");
    mockClerk([
      {
        id: "user_stranger",
        emailAddresses: [{ emailAddress: "stranger@example.com" }],
        publicMetadata: {},
      },
    ]);
    await expect(
      callRoute(["admin", "backfillOg"], { db: ctx.db }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("grants OG to every eligible Clerk user when the owner triggers it", async () => {
    signedInAs("user_owner");
    mockClerk([
      {
        id: "user_owner",
        emailAddresses: [{ emailAddress: OWNER_EMAILS[0]! }],
        publicMetadata: {},
      },
      {
        id: "user_b",
        emailAddresses: [{ emailAddress: "b@example.com" }],
        publicMetadata: {},
      },
      {
        id: "user_c",
        emailAddresses: [{ emailAddress: "c@example.com" }],
        publicMetadata: {},
      },
    ]);
    const out = await callRoute<BackfillOgOutput>(
      ["admin", "backfillOg"],
      { db: ctx.db },
    );
    expect(out.scanned).toBe(3);
    expect(out.granted).toBe(3);
    expect(out.alreadyGranted).toBe(0);
    expect(out.pastMilestone).toBe(0);
    // Each user has og_granted_at stamped and a notification fired.
    for (const id of ["user_owner", "user_b", "user_c"]) {
      const row = await ctx.db.users.findById(id);
      expect(row?.ogGrantedAt).not.toBeNull();
      const notifs = await ctx.db.notifications.listForUser(id);
      expect(notifs.length).toBe(1);
      expect(notifs[0]!.kind).toBe("og_granted");
    }
  });

  it("is idempotent — second run reports already-granted users without re-granting", async () => {
    signedInAs("user_owner");
    mockClerk([
      {
        id: "user_owner",
        emailAddresses: [{ emailAddress: OWNER_EMAILS[0]! }],
        publicMetadata: {},
      },
      {
        id: "user_b",
        emailAddresses: [{ emailAddress: "b@example.com" }],
        publicMetadata: {},
      },
    ]);
    await callRoute<BackfillOgOutput>(["admin", "backfillOg"], { db: ctx.db });
    const second = await callRoute<BackfillOgOutput>(
      ["admin", "backfillOg"],
      { db: ctx.db },
    );
    expect(second.scanned).toBe(2);
    expect(second.granted).toBe(0);
    expect(second.alreadyGranted).toBe(2);
    // Still only one notification per user.
    expect((await ctx.db.notifications.listForUser("user_b")).length).toBe(1);
  });

  it("rejects unauthenticated callers", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["admin", "backfillOg"], { db: ctx.db }),
    ).rejects.toBeInstanceOf(BackendError);
  });
});
