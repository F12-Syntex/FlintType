import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
}));

import { callRoute } from "@/server/testing";
import { __resetStoreForTests } from "@/server/race/store";
import type {
  CancelChallengeOutput,
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

  it("create refuses unknown modeIds via the schema", async () => {
    // The pipeline rethrows ZodError as-is; the HTTP dispatcher is
    // what maps it to BackendError(VALIDATION). callRoute bypasses
    // the dispatcher, so we assert the raw zod error instead.
    await expect(
      callRoute(["race", "challenge", "create"], {
        input: { modeId: "burst" as never },
      }),
    ).rejects.toBeInstanceOf(ZodError);
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

  it("cancel as host wipes the lobby and frees the slug", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const res = await callRoute<CancelChallengeOutput>(
      ["race", "challenge", "cancel"],
      { input: { roomId: host.roomId, sessionToken: host.sessionToken } },
    );
    expect(res.ok).toBe(true);
    // Slug must now be gone — a fresh join 404s.
    await expect(
      callRoute(["race", "challenge", "join"], {
        input: { slug: host.slug },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cancel as non-host is forbidden", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const joiner = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    await expect(
      callRoute(["race", "challenge", "cancel"], {
        input: { roomId: host.roomId, sessionToken: joiner.sessionToken },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("join returns a spectator response when the lobby is past lobby phase", async () => {
    // Create the room with the host, then start it — the room moves
    // into countdown and a fresh join can't take a seat. Instead of
    // 409-ing, the route now returns `spectate: true` with an empty
    // sessionToken so the client can mount in read-only mode.
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    await callRoute<StartChallengeOutput>(
      ["race", "challenge", "start"],
      { input: { roomId: host.roomId, sessionToken: host.sessionToken } },
    );
    // 1v1 is full after host + 1 bot fill; combined with the lobby
    // phase advancing past matching, addRealRacer returns null.
    vi.advanceTimersByTime(800);
    const spectator = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    expect(spectator.spectate).toBe(true);
    expect(spectator.sessionToken).toBe("");
    expect(spectator.roomId).toBe(host.roomId);
  });
});
