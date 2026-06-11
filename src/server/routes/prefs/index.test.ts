import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type {
  GetUserPrefsOutput,
  SetUserPrefsOutput,
} from "@/types/user-prefs";

const mockAuth = vi.mocked(auth);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe("prefs routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    mockAuth.mockReset();
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("rejects unauthenticated calls", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["prefs", "get"], { db: ctx.db }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("returns {} for users with no stored prefs", async () => {
    signedInAs("user_a");
    const got = await callRoute<GetUserPrefsOutput>(["prefs", "get"], {
      db: ctx.db,
    });
    expect(got).toEqual({});
  });

  it("set then get round-trips a blob", async () => {
    signedInAs("user_a");
    const blob = { caret: { style: "block", width: 3 } };
    const setRes = await callRoute<SetUserPrefsOutput>(["prefs", "set"], {
      db: ctx.db,
      input: { data: blob },
    });
    expect(setRes).toEqual(blob);
    const getRes = await callRoute<GetUserPrefsOutput>(["prefs", "get"], {
      db: ctx.db,
    });
    expect(getRes).toEqual(blob);
  });

  it("set cannot clobber server-owned keys (FT-007)", async () => {
    signedInAs("user_a");
    // A server event writes the adapt model + a granted tag selection.
    await ctx.db.userPrefs.merge("user_a", {
      adaptRecency: { the: 2 },
      adaptFingerMapHash: "h1",
      selectedTags: ["og"],
    });
    // The client later flushes its blob snapshot, which carries STALE
    // (or absent) values for those server-owned keys.
    const setRes = await callRoute<SetUserPrefsOutput>(["prefs", "set"], {
      db: ctx.db,
      input: {
        data: {
          caret: { style: "line" },
          adaptRecency: { stale: 99 },
          // selectedTags omitted entirely by the client
        },
      },
    });
    // Client-owned slice is written; server-owned keys keep their stored
    // values regardless of what the client sent.
    expect(setRes.caret).toEqual({ style: "line" });
    expect(setRes.adaptRecency).toEqual({ the: 2 });
    expect(setRes.selectedTags).toEqual(["og"]);
    expect(setRes.adaptFingerMapHash).toBe("h1");
    const getRes = await callRoute<GetUserPrefsOutput>(["prefs", "get"], {
      db: ctx.db,
    });
    expect(getRes.adaptRecency).toEqual({ the: 2 });
    expect(getRes.selectedTags).toEqual(["og"]);
  });

  it("drillComplete bumps the server-authoritative count and is auth-gated (FT-029)", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["prefs", "drillComplete"], { db: ctx.db }),
    ).rejects.toBeInstanceOf(BackendError);

    signedInAs("user_d");
    const r1 = await callRoute<{ drillsCompleted: number }>(
      ["prefs", "drillComplete"],
      { db: ctx.db },
    );
    expect(r1.drillsCompleted).toBe(1);
    const r2 = await callRoute<{ drillsCompleted: number }>(
      ["prefs", "drillComplete"],
      { db: ctx.db },
    );
    expect(r2.drillsCompleted).toBe(2);

    // A client `set` can't forge the count — server-owned key is preserved.
    await callRoute(["prefs", "set"], {
      db: ctx.db,
      input: { data: { lifetimeStats: { drillsCompleted: 9999 } } },
    });
    const got = await callRoute<GetUserPrefsOutput>(["prefs", "get"], {
      db: ctx.db,
    });
    expect(
      (got.lifetimeStats as { drillsCompleted: number }).drillsCompleted,
    ).toBe(2);
  });

  it("validates the wire shape", async () => {
    signedInAs("user_a");
    // Pipeline rethrows ZodError as-is; the dispatcher is what maps it
    // to BackendError at the HTTP boundary.
    await expect(
      callRoute(["prefs", "set"], { db: ctx.db, input: { data: "nope" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
