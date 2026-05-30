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

  it("passes the current settings to the model", async () => {
    signedIn();
    mockLlm.mockResolvedValue({ summary: "ok", changes: [] });
    await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: {
        prompt: "warmer",
        current: { theme: { "--background": "oklch(0.95 0.02 85)" } },
      },
    });
    const userMsg = mockLlm.mock.calls[0]![0].user;
    expect(userMsg).toContain("Current settings");
    expect(userMsg).toContain("oklch(0.95 0.02 85)");
    expect(userMsg).toContain("warmer");
  });

  it("resolves a palette tool into matching colours", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "A matching set.",
      changes: [],
      tools: { palette: { base: "oklch(0.65 0.2 30)", harmony: "analogous" } },
    });
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "colours that go together" },
    });
    expect(Object.keys(out.patch.theme).length).toBeGreaterThan(5);
    expect(out.patch.theme["--primary"]).toMatch(/^oklch\(/);
    expect(out.changes.some((c) => c.label === "Palette")).toBe(true);
  });

  it("resolves a randomize tool, direct values winning over tools", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "Surprise.",
      changes: [],
      theme: { "--primary": "oklch(0.5 0.3 0)" },
      tools: { randomize: ["--primary", "tapeMode"] },
    });
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "surprise me" },
    });
    // direct --primary beats the randomised one
    expect(out.patch.theme["--primary"]).toBe("oklch(0.5 0.3 0)");
    expect(["off", "word", "letter"]).toContain(out.patch.appearance.tapeMode);
    expect(out.changes.some((c) => c.label === "Randomised")).toBe(true);
  });
});
