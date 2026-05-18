import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
}));

import { callRoute } from "@/server/testing";
import { __resetStoreForTests, getRoom } from "@/server/race/store";
import type {
  KeystrokeOutput,
  LeaveOutput,
  QueueOutput,
} from "@/types/race";

describe("race routes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetStoreForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("queue creates a room and assigns a session token", async () => {
    const res = await callRoute<QueueOutput>(["race", "queue"], {
      input: { modeId: "1v1" },
    });
    expect(res.roomId).toMatch(/^r_/);
    expect(res.sessionToken).toMatch(/^s_/);
    const room = getRoom(res.roomId);
    expect(room?.snapshot().racers.length).toBe(1);
  });

  it("two queue calls for the same mode share a room until it locks", async () => {
    const a = await callRoute<QueueOutput>(["race", "queue"], {
      input: { modeId: "1v1" },
    });
    const b = await callRoute<QueueOutput>(["race", "queue"], {
      input: { modeId: "1v1" },
    });
    expect(b.roomId).toBe(a.roomId);
  });

  it("keystroke updates a real racer's progress once racing has begun", async () => {
    const join = await callRoute<QueueOutput>(["race", "queue"], {
      input: { modeId: "1v1" },
    });
    // Advance through matching → lobby → countdown → racing.
    vi.advanceTimersByTime(1_000 + 700 + 3_000);
    const room = getRoom(join.roomId)!;
    expect(room.phase).toBe("racing");
    const res = await callRoute<KeystrokeOutput>(["race", "keystroke"], {
      input: {
        roomId: join.roomId,
        sessionToken: join.sessionToken,
        progressChars: 5,
        wpm: 60,
      },
    });
    expect(res.ok).toBe(true);
    const me = room.snapshot().racers.find((r) => r.id === join.sessionToken);
    expect(me?.progressChars).toBe(5);
    expect(me?.wpm).toBe(60);
  });

  it("keystroke is a graceful no-op outside racing (no error)", async () => {
    const join = await callRoute<QueueOutput>(["race", "queue"], {
      input: { modeId: "1v1" },
    });
    const res = await callRoute<KeystrokeOutput>(["race", "keystroke"], {
      input: {
        roomId: join.roomId,
        sessionToken: join.sessionToken,
        progressChars: 5,
        wpm: 60,
      },
    });
    expect(res.ok).toBe(true);
  });

  it("leave drops the racer but keeps the room alive for late rejoins", async () => {
    const join = await callRoute<QueueOutput>(["race", "queue"], {
      input: { modeId: "1v1v1v1" },
    });
    const before = getRoom(join.roomId)?.snapshot().racers.length;
    expect(before).toBe(1);
    await callRoute<LeaveOutput>(["race", "leave"], {
      input: { roomId: join.roomId, sessionToken: join.sessionToken },
    });
    // The room intentionally survives a last-real-leave so React
    // strict-mode / dev fast-refresh remounts can reconnect without
    // a 404. The natural idle GC handles cleanup.
    const room = getRoom(join.roomId);
    expect(room).not.toBeNull();
    expect(room?.snapshot().racers.find((r) => !r.isBot)).toBeUndefined();
  });

  it("keystroke rejects unknown roomId with NOT_FOUND", async () => {
    await expect(
      callRoute(["race", "keystroke"], {
        input: {
          roomId: "r_missing",
          sessionToken: "s_x",
          progressChars: 0,
          wpm: 0,
        },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
