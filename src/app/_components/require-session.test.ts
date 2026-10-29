import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireSession } from "./require-session";

const mockAuth = vi.mocked(auth);
const mockRedirect = vi.mocked(redirect);

function signedInAs(userId: string | null) {
  mockAuth.mockResolvedValue({ userId } as unknown as Awaited<
    ReturnType<typeof auth>
  >);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockRedirect.mockClear();
});

describe("requireSession", () => {
  it("sends a signed-out visitor to sign-in, set to come back", async () => {
    signedInAs(null);
    await expect(requireSession("/drills")).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?redirect_url=%2Fdrills",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in?redirect_url=%2Fdrills");
  });

  it("falls back to a plain sign-in for home", async () => {
    signedInAs(null);
    await expect(requireSession("/")).rejects.toThrow("NEXT_REDIRECT /sign-in");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("lets a signed-in user through", async () => {
    signedInAs("user_1");
    await expect(requireSession("/insights")).resolves.toBeUndefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
