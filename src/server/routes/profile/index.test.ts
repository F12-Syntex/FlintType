import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { callRoute } from "@/server/testing";
import type { UpdateUsernameOutput } from "@/types/profile";
import { _resetUsernameWindow } from "./index";

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type ClerkUserLike = {
  id: string;
  username: string | null;
};

function mockClerk({
  me,
  byUsername = {},
  updateThrows = false,
}: {
  me: ClerkUserLike;
  byUsername?: Record<string, ClerkUserLike[]>;
  updateThrows?: boolean;
}) {
  const updateUser = vi.fn(async (id: string, patch: { username?: string }) => {
    if (updateThrows) throw new Error("clerk write failed");
    return { ...me, id, username: patch.username ?? me.username };
  });
  mockClerkClient.mockResolvedValue({
    users: {
      getUser: vi.fn(async (id: string) =>
        id === me.id ? me : { id, username: null },
      ),
      getUserList: vi.fn(async ({ username }: { username?: string[] }) => {
        const name = username?.[0]?.toLowerCase() ?? "";
        return { data: byUsername[name] ?? [], totalCount: 0 };
      }),
      updateUser,
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  return { updateUser };
}

function signedInAs(userId: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe("profile.updateUsername", () => {
  beforeEach(() => {
    _resetUsernameWindow();
    mockAuth.mockReset();
    mockClerkClient.mockReset();
  });
  afterEach(() => {
    _resetUsernameWindow();
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "valid_name" },
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects usernames with digits or special chars (Zod)", async () => {
    // Zod throws raw `ZodError` through `callRoute` — only the HTTP
    // dispatcher maps it to BackendError(400, 'VALIDATION') for the
    // wire. Asserting "the call rejects" is the right contract here:
    // we care the input never reaches the handler.
    signedInAs("u_1");
    mockClerk({ me: { id: "u_1", username: "old" } });
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "abc123" },
      }),
    ).rejects.toThrow();
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "ab-cd" },
      }),
    ).rejects.toThrow();
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "a" },
      }),
    ).rejects.toThrow();
  });

  it("rejects usernames already held by another user with CONFLICT", async () => {
    signedInAs("u_me");
    mockClerk({
      me: { id: "u_me", username: "old_name" },
      byUsername: { taken: [{ id: "u_other", username: "taken" }] },
    });
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "taken" },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns the new username on success", async () => {
    signedInAs("u_me");
    mockClerk({ me: { id: "u_me", username: "old_name" } });
    const out = await callRoute<UpdateUsernameOutput>(
      ["profile", "updateUsername"],
      { input: { username: "new_name" } },
    );
    expect(out.username).toBe("new_name");
  });

  it("no-op when new value equals current (case-insensitive) — does not consume budget", async () => {
    signedInAs("u_me");
    mockClerk({ me: { id: "u_me", username: "Sam" } });
    const out = await callRoute<UpdateUsernameOutput>(
      ["profile", "updateUsername"],
      { input: { username: "sam" } },
    );
    expect(out.username).toBe("Sam");
    // Second call (different name) within the hour must still succeed.
    mockClerk({ me: { id: "u_me", username: "Sam" } });
    await expect(
      callRoute<UpdateUsernameOutput>(["profile", "updateUsername"], {
        input: { username: "new_name" },
      }),
    ).resolves.toMatchObject({ username: "new_name" });
  });

  it("rate-limits a second successful update within the hour (RATE_LIMITED)", async () => {
    signedInAs("u_me");
    mockClerk({ me: { id: "u_me", username: "first" } });
    await callRoute<UpdateUsernameOutput>(["profile", "updateUsername"], {
      input: { username: "second" },
    });
    mockClerk({ me: { id: "u_me", username: "second" } });
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "third" },
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("does NOT consume rate budget on a failed validation", async () => {
    signedInAs("u_me");
    mockClerk({ me: { id: "u_me", username: "first" } });
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "bad-name!" },
      }),
    ).rejects.toThrow();
    // Still allowed because no successful write was recorded.
    mockClerk({ me: { id: "u_me", username: "first" } });
    await expect(
      callRoute<UpdateUsernameOutput>(["profile", "updateUsername"], {
        input: { username: "good_name" },
      }),
    ).resolves.toMatchObject({ username: "good_name" });
  });

  it("maps Clerk write failures to CONFLICT (TOCTOU)", async () => {
    signedInAs("u_me");
    mockClerk({
      me: { id: "u_me", username: "first" },
      updateThrows: true,
    });
    await expect(
      callRoute(["profile", "updateUsername"], {
        input: { username: "second" },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
