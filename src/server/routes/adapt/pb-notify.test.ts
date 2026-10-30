import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/user-display", () => ({
  resolveUserDisplays: vi.fn(async () =>
    new Map([["u1", { userId: "u1", username: "mara", name: "@Mara", tags: [], imageUrl: null }]]),
  ),
}));

import type { Database } from "@/db/server";
import { friendPbSentence, pbSentence } from "@/lib/pb-copy";
import { logger } from "@/server/logger";
import type { SubmitTestInput } from "@/types/adapt";
import { notifyPersonalBest } from "./pb-notify";

function input(over: Partial<SubmitTestInput> = {}): SubmitTestInput {
  return {
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_010_000,
    mode: "casual",
    durationOrWordCount: 30,
    wpm: 100,
    accuracy: 100,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    words: ["the", "and"],
    timings: [],
    ...over,
  };
}

type Created = { userId: string; kind: string; title: string; body: string; data: Record<string, unknown> };

function fakeDb(followers: string[] = []) {
  const created: Created[] = [];
  const db = {
    notifications: {
      createIfAbsent: vi.fn(async (row: Created) => {
        created.push(row);
      }),
    },
    follows: { listFollowers: vi.fn(async () => followers.map((userId) => ({ userId }))) },
  } as unknown as Database;
  return { db, created };
}

async function notify(over: Partial<SubmitTestInput>, previousWpm: number | null, followers: string[] = []) {
  const { db, created } = fakeDb(followers);
  await notifyPersonalBest({ db, log: logger, userId: "u1", testId: "t1", input: input(over), previousWpm });
  return created;
}

describe("notifyPersonalBest: the personal_best row", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores the pbSentence body and never the previous best", async () => {
    const run = { wpm: 160.4, accuracy: 97.5, lengthMode: "time" as const, durationOrWordCount: 60 };
    const [row] = await notify(run, 155.6);
    expect(row!.kind).toBe("personal_best");
    expect(row!.title).toBe("New personal best");
    expect(row!.body).toBe(pbSentence(input(run)));
    expect(row!.body).toBe("160 wpm at 97.5% accuracy in a Casual test of 60 seconds.");
    expect(row!.body).not.toContain("previous best");
    expect(row!.data.previousWpm).toBe(155.6);
  });

  it("titles a first run and leaves the body the same sentence", async () => {
    const [row] = await notify({}, null);
    expect(row!.title).toBe("First completed run");
    expect(row!.body).toBe(pbSentence(input()));
  });

  it("stores lengthMode in data, null when the run sent none", async () => {
    const [withMode] = await notify({ lengthMode: "words", durationOrWordCount: 25 }, null);
    expect(withMode!.data.lengthMode).toBe("words");
    const [legacy] = await notify({}, null);
    expect(legacy!.data.lengthMode).toBeNull();
  });
});

describe("notifyPersonalBest: the friend_pb fan-out", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes a friendPbSentence body and lengthMode for each follower", async () => {
    const run = { mode: "training" as const, lengthMode: "words" as const, durationOrWordCount: 25, wpm: 188 };
    const rows = await notify(run, null, ["u2", "u3"]);
    const friend = rows.filter((r) => r.kind === "friend_pb");
    expect(friend.map((r) => r.userId)).toEqual(["u2", "u3"]);
    expect(friend[0]!.body).toBe(friendPbSentence("@Mara", input(run)));
    expect(friend[0]!.body).toBe("@Mara hit 188 wpm in an Adapt test of 25 words.");
    expect(friend[0]!.data.lengthMode).toBe("words");
  });

  it("no followers, no fan-out", async () => {
    const rows = await notify({}, null, []);
    expect(rows.map((r) => r.kind)).toEqual(["personal_best"]);
  });
});
