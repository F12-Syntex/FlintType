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

  it("set strips server-owned keys from client input", async () => {
    signedInAs("user_a");
    const res = await callRoute<SetUserPrefsOutput>(["prefs", "set"], {
      db: ctx.db,
      input: {
        data: {
          caret: { style: "block" },
          selectedTags: ["owner"], // client must not be able to write this
          adaptRecency: { th: 1 },
        },
      },
    });
    expect(res).toEqual({ caret: { style: "block" } });
    const stored = await ctx.db.userPrefs.get("user_a");
    expect(stored.selectedTags).toBeUndefined();
    expect(stored.adaptRecency).toBeUndefined();
  });

  it("set preserves stored server-owned slices across a wholesale replace", async () => {
    signedInAs("user_a");
    // Server-side writers landed these.
    await ctx.db.userPrefs.merge("user_a", {
      selectedTags: ["og"],
      adaptRecency: { th: 2 },
      monkeytypeStats: { completedTests: 5 },
      caret: { style: "line" },
    });
    // Client reset-all / import replaces the client-owned blob.
    await callRoute(["prefs", "set"], {
      db: ctx.db,
      input: { data: { behaviour: { stopOnError: true } } },
    });
    const stored = await ctx.db.userPrefs.get("user_a");
    expect(stored.caret).toBeUndefined(); // client-owned slice replaced away
    expect(stored.behaviour).toEqual({ stopOnError: true });
    expect(stored.selectedTags).toEqual(["og"]); // server state survives
    expect(stored.adaptRecency).toEqual({ th: 2 });
    expect(stored.monkeytypeStats).toEqual({ completedTests: 5 });
  });

  it("merge requires auth", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["prefs", "merge"], { db: ctx.db, input: { data: {} } }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("merge validates the wire shape", async () => {
    signedInAs("user_a");
    await expect(
      callRoute(["prefs", "merge"], {
        db: ctx.db,
        input: { data: {}, remove: [123] },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("merge patches only the sent slices and honours remove", async () => {
    signedInAs("user_a");
    await ctx.db.userPrefs.set("user_a", {
      caret: { style: "line" },
      behaviour: { stopOnError: false },
      theme: { "--primary": "#fff" },
    });
    await callRoute(["prefs", "merge"], {
      db: ctx.db,
      input: {
        data: { behaviour: { stopOnError: true } },
        remove: ["theme"],
      },
    });
    const stored = await ctx.db.userPrefs.get("user_a");
    expect(stored.caret).toEqual({ style: "line" }); // untouched
    expect(stored.behaviour).toEqual({ stopOnError: true });
    expect(stored.theme).toBeUndefined();
  });

  it("merge strips server-owned keys from both data and remove", async () => {
    signedInAs("user_a");
    await ctx.db.userPrefs.merge("user_a", { selectedTags: ["og"] });
    await callRoute(["prefs", "merge"], {
      db: ctx.db,
      input: {
        data: { monkeytypeStats: { completedTests: 999 } },
        remove: ["selectedTags"],
      },
    });
    const stored = await ctx.db.userPrefs.get("user_a");
    expect(stored.monkeytypeStats).toBeUndefined(); // not client-writable
    expect(stored.selectedTags).toEqual(["og"]); // not client-removable
  });
});
