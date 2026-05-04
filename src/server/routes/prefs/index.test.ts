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

  it("validates the wire shape", async () => {
    signedInAs("user_a");
    // Pipeline rethrows ZodError as-is; the dispatcher is what maps it
    // to BackendError at the HTTP boundary.
    await expect(
      callRoute(["prefs", "set"], { db: ctx.db, input: { data: "nope" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
