import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
}));

import { callRoute } from "@/server/testing";
import { __resetStoreForTests } from "@/server/race/store";
import type {
  CreateChallengeOutput,
  JoinChallengeOutput,
  StartChallengeOutput,
} from "@/types/race";

describe("race.challenge routes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetStoreForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("create returns roomId + slug + sessionToken", async () => {
    const res = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    expect(res.roomId).toMatch(/^r_/);
    expect(res.slug).toMatch(/^[a-z]+-[a-z]+-\d+$/);
    expect(res.sessionToken).toMatch(/^s_/);
  });

  it("join lets a second player land in the same room by slug", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const joiner = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    expect(joiner.roomId).toBe(host.roomId);
    expect(joiner.sessionToken).not.toBe(host.sessionToken);
  });

  it("join 404s on an unknown slug", async () => {
    await expect(
      callRoute(["race", "challenge", "join"], {
        input: { slug: "nope-nope-99" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("start fails if caller is not the host", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const joiner = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    await expect(
      callRoute(["race", "challenge", "start"], {
        input: { roomId: host.roomId, sessionToken: joiner.sessionToken },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("start as host fills bots and kicks off the lobby→countdown→racing sequence", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const res = await callRoute<StartChallengeOutput>(
      ["race", "challenge", "start"],
      { input: { roomId: host.roomId, sessionToken: host.sessionToken } },
    );
    expect(res.ok).toBe(true);
    // 700ms lobby hold then 3s countdown → racing.
    vi.advanceTimersByTime(700 + 3_000);
    // No assertion needed beyond "didn't throw" — the room module's
    // own tests cover the timeline. This route test verifies the route
    // forwarded the call.
  });
});
