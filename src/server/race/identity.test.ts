import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { getRaceIdentity, guestNameFor } from "./identity";

const mockAuth = vi.mocked(auth);
const mockUser = vi.mocked(currentUser);

describe("race/identity", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockUser.mockReset();
  });

  it("returns the user's handle and RACER badge when signed in", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_1",
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUser.mockResolvedValue({
      firstName: "Saif",
      username: null,
      emailAddresses: [],
    } as unknown as Awaited<ReturnType<typeof currentUser>>);
    const id = await getRaceIdentity("seed");
    expect(id).toEqual({ name: "@Saif", badge: "RACER" });
  });

  it("falls back to a deterministic Guest label when anonymous", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const a = await getRaceIdentity("token-abc");
    const b = await getRaceIdentity("token-abc");
    expect(a.name).toBe(b.name);
    expect(a.name).toMatch(/^Guest · [A-Z]{3}$/);
    expect(a.badge).toBe("GUEST");
  });

  it("guestNameFor is stable per seed and different across seeds", () => {
    expect(guestNameFor("abc")).toBe(guestNameFor("abc"));
    expect(guestNameFor("abc")).not.toBe(guestNameFor("xyz"));
  });

  it("guest names never use the visually-confusable letters O or I", () => {
    for (let i = 0; i < 200; i += 1) {
      const n = guestNameFor(`seed-${i}`);
      expect(n).not.toMatch(/[OI]/);
    }
  });

  it("swallows Clerk failures and yields a guest label", async () => {
    mockAuth.mockRejectedValue(new Error("clerk-down"));
    const id = await getRaceIdentity("seed");
    expect(id.badge).toBe("GUEST");
  });
});
