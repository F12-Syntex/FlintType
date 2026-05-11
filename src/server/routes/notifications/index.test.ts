import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type { ListNotificationsOutput } from "@/types/notification";

const mockAuth = vi.mocked(auth);

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe("notifications routes", () => {
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

  it("list rejects anonymous viewers", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["notifications", "list"], { db: ctx.db }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("list returns rows + accurate unreadCount, scoped per-user", async () => {
    await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "welcome",
      body: "hi",
    });
    await ctx.db.notifications.create({
      userId: "u1",
      kind: "personal_best",
      title: "60s PB",
      body: "100 wpm",
      data: { mode: "casual", durationOrWordCount: 60, wpm: 100, accuracy: 98, previousWpm: 92 },
    });
    await ctx.db.notifications.create({
      userId: "u2",
      kind: "announcement",
      title: "not yours",
      body: "",
    });
    signedInAs("u1");
    const out = await callRoute<ListNotificationsOutput>(
      ["notifications", "list"],
      { db: ctx.db },
    );
    expect(out.items.length).toBe(2);
    expect(out.unreadCount).toBe(2);
    const pb = out.items.find((n) => n.kind === "personal_best");
    expect(pb).toBeTruthy();
    expect(pb?.data).toMatchObject({ wpm: 100, previousWpm: 92 });
  });

  it("markRead flips unreadCount; markAllRead zeroes it", async () => {
    const a = await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "a",
      body: "",
    });
    await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "b",
      body: "",
    });
    signedInAs("u1");
    await callRoute(["notifications", "markRead"], {
      db: ctx.db,
      input: { id: a.id },
    });
    let out = await callRoute<ListNotificationsOutput>(
      ["notifications", "list"],
      { db: ctx.db },
    );
    expect(out.unreadCount).toBe(1);
    await callRoute(["notifications", "markAllRead"], { db: ctx.db });
    out = await callRoute<ListNotificationsOutput>(
      ["notifications", "list"],
      { db: ctx.db },
    );
    expect(out.unreadCount).toBe(0);
  });

  it("strips the internal __dedupe field from data payloads on the wire", async () => {
    await ctx.db.notifications.createIfAbsent({
      userId: "u1",
      kind: "personal_best",
      title: "PB",
      body: "",
      data: { wpm: 100, mode: "casual", durationOrWordCount: 60 },
      dedupeKey: "pb:casual:60:100",
    });
    signedInAs("u1");
    const out = await callRoute<ListNotificationsOutput>(
      ["notifications", "list"],
      { db: ctx.db },
    );
    const row = out.items[0]!;
    // Dedupe key never reaches the client.
    expect((row.data as Record<string, unknown> | null)?.__dedupe).toBeUndefined();
    // The real payload survives.
    expect((row.data as Record<string, unknown>).wpm).toBe(100);
  });
});
