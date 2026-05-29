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
  SetReadyOutput,
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

  it("create with quote:true makes a quote-passage room (multi-word passage)", async () => {
    const res = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1", quote: true, quoteLengths: [0, 1, 2] } },
    );
    expect(res.roomId).toMatch(/^r_/);
    // A quote splits into several words; totalChars matches the words.
    expect(res.words.length).toBeGreaterThan(1);
    expect(res.totalChars).toBeGreaterThan(0);
  });

  it("create rejects an out-of-range quoteLengths id via the schema", async () => {
    await expect(
      callRoute(["race", "challenge", "create"], {
        input: { modeId: "1v1", quote: true, quoteLengths: [4] as never },
      }),
    ).rejects.toBeInstanceOf(ZodError);
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

  it("start as host kicks off the lobby→countdown→racing sequence (real players only, no bots)", async () => {
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

  it("start is blocked until every other human readies up (#26)", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const joiner = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    // Joiner hasn't readied → host's start is rejected with CONFLICT.
    await expect(
      callRoute(["race", "challenge", "start"], {
        input: { roomId: host.roomId, sessionToken: host.sessionToken },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    // Joiner readies up → canStart flips true → host can start.
    const ready = await callRoute<SetReadyOutput>(["race", "setReady"], {
      input: {
        roomId: host.roomId,
        sessionToken: joiner.sessionToken,
        ready: true,
      },
    });
    expect(ready.ok).toBe(true);
    expect(ready.canStart).toBe(true);

    const res = await callRoute<StartChallengeOutput>(
      ["race", "challenge", "start"],
      { input: { roomId: host.roomId, sessionToken: host.sessionToken } },
    );
    expect(res.ok).toBe(true);
  });

  it("setReady reports canStart=false while a human is unready", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const joiner = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    const r1 = await callRoute<SetReadyOutput>(["race", "setReady"], {
      input: { roomId: host.roomId, sessionToken: joiner.sessionToken, ready: true },
    });
    expect(r1.canStart).toBe(true);
    const r2 = await callRoute<SetReadyOutput>(["race", "setReady"], {
      input: { roomId: host.roomId, sessionToken: joiner.sessionToken, ready: false },
    });
    expect(r2.canStart).toBe(false);
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

  it("FFA seats 8 real joiners; the 9th join is a read-only spectator", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "ffa" } },
    );
    // Host is seat 1 — add 7 more real joiners to reach the capacity of 8.
    for (let i = 0; i < 7; i += 1) {
      const j = await callRoute<JoinChallengeOutput>(
        ["race", "challenge", "join"],
        { input: { slug: host.slug } },
      );
      expect(j.spectate).toBeUndefined();
      expect(j.sessionToken).toMatch(/^s_/);
    }
    const ninth = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    expect(ninth.spectate).toBe(true);
    expect(ninth.sessionToken).toBe("");
    expect(ninth.roomId).toBe(host.roomId);
  });

  it("a third joiner on a full 1v1 lobby spectates (capacity gate, still in lobby)", async () => {
    const host = await callRoute<CreateChallengeOutput>(
      ["race", "challenge", "create"],
      { input: { modeId: "1v1" } },
    );
    const second = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    expect(second.spectate).toBeUndefined();
    // Room is now full (host + 1) and still in lobby — a third lands as
    // a spectator without the host ever pressing Start.
    const third = await callRoute<JoinChallengeOutput>(
      ["race", "challenge", "join"],
      { input: { slug: host.slug } },
    );
    expect(third.spectate).toBe(true);
    expect(third.sessionToken).toBe("");
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
