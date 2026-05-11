import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

describe("notifications repo", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("create + list newest-first per user", async () => {
    await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "older",
      body: "first",
    });
    // Tiny gap so created_at sorts deterministically even on fast clocks.
    await new Promise((r) => setTimeout(r, 5));
    await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "newer",
      body: "second",
    });
    const list = await ctx.db.notifications.listForUser("u1");
    expect(list.length).toBe(2);
    expect(list[0]!.title).toBe("newer");
    expect(list[1]!.title).toBe("older");
  });

  it("scopes by userId — neighbour rows aren't visible", async () => {
    await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "mine",
      body: "",
    });
    await ctx.db.notifications.create({
      userId: "u2",
      kind: "announcement",
      title: "yours",
      body: "",
    });
    const u1 = await ctx.db.notifications.listForUser("u1");
    expect(u1.length).toBe(1);
    expect(u1[0]!.title).toBe("mine");
  });

  it("unreadCount tracks markRead / markAllRead", async () => {
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
    expect(await ctx.db.notifications.unreadCountForUser("u1")).toBe(2);
    await ctx.db.notifications.markRead("u1", a.id);
    expect(await ctx.db.notifications.unreadCountForUser("u1")).toBe(1);
    await ctx.db.notifications.markAllRead("u1");
    expect(await ctx.db.notifications.unreadCountForUser("u1")).toBe(0);
  });

  it("markRead is no-op cross-user (can't acknowledge someone else's row)", async () => {
    const row = await ctx.db.notifications.create({
      userId: "u1",
      kind: "announcement",
      title: "private",
      body: "",
    });
    await ctx.db.notifications.markRead("u2", row.id);
    expect(await ctx.db.notifications.unreadCountForUser("u1")).toBe(1);
  });

  it("createIfAbsent dedupes by (userId, kind, dedupeKey)", async () => {
    const first = await ctx.db.notifications.createIfAbsent({
      userId: "u1",
      kind: "personal_best",
      title: "PB!",
      body: "60s @ 100 wpm",
      dedupeKey: "pb:casual:60:100",
    });
    expect(first.created).toBe(true);
    const second = await ctx.db.notifications.createIfAbsent({
      userId: "u1",
      kind: "personal_best",
      title: "duplicate PB",
      body: "should be skipped",
      dedupeKey: "pb:casual:60:100",
    });
    expect(second.created).toBe(false);
    expect(second.row.id).toBe(first.row.id);
    // Different dedupe key — different row created.
    const third = await ctx.db.notifications.createIfAbsent({
      userId: "u1",
      kind: "personal_best",
      title: "new PB",
      body: "60s @ 105 wpm",
      dedupeKey: "pb:casual:60:105",
    });
    expect(third.created).toBe(true);
    const list = await ctx.db.notifications.listForUser("u1");
    expect(list.length).toBe(2);
  });
});
