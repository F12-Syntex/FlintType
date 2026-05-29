import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));
vi.mock("@/server/openrouter", () => ({
  openRouterJson: vi.fn(),
}));

import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { BackendError } from "@/lib/errors";
import { openRouterJson } from "@/server/openrouter";
import { callRoute } from "@/server/testing";
import type { AiSuggestOutput } from "@/types/appearance-ai";

const mockAuth = vi.mocked(auth);
const mockLlm = vi.mocked(openRouterJson);

function signedIn(userId = "user_a") {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: {},
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe("appearance.aiSuggest", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockLlm.mockReset();
  });

  it("rejects unauthenticated calls", async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(["appearance", "aiSuggest"], { input: { prompt: "green" } }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("validates the input shape", async () => {
    signedIn();
    await expect(
      callRoute(["appearance", "aiSuggest"], { input: { prompt: "" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("returns a sanitized patch from the model reply", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "A light green, larger serif look.",
      changes: [{ label: "Background", value: "light green" }],
      theme: {
        "--background": "oklch(0.95 0.05 140)",
        "--ft-font-scale": "1.4",
        "--evil": "boom; }",
      },
      appearance: { tapeMode: "word", bogus: "x" },
      background: { imageUrl: "javascript:alert(1)" },
    });

    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "light green, bigger serif" },
    });

    expect(out.summary).toContain("green");
    expect(out.changes).toEqual([{ label: "Background", value: "light green" }]);
    expect(out.patch.theme).toEqual({
      "--background": "oklch(0.95 0.05 140)",
      "--ft-font-scale": "1.4",
    });
    expect(out.patch.appearance).toEqual({ tapeMode: "word" });
    expect(out.patch.background).toEqual({});
  });

  it("returns empty buckets when the model returns junk", async () => {
    signedIn();
    mockLlm.mockResolvedValue("not an object");
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "whatever" },
    });
    expect(out.patch).toEqual({ theme: {}, appearance: {}, background: {} });
    expect(out.changes).toEqual([]);
  });
});
