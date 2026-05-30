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

  it("resolves the model's option choices into a patch", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "A green, larger serif look.",
      changes: [],
      options: { surface: "mint", accent: "green", font: "serif", fontSize: "large", tape: "word" },
    });

    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "minty green, bigger serif" },
    });

    expect(out.summary).toContain("green");
    expect(out.patch.theme["--background"]).toMatch(/^oklch\(/);
    expect(out.patch.theme["--primary"]).toMatch(/^oklch\(/);
    expect(out.patch.theme["--ft-font-family"]).toContain("serif");
    expect(out.patch.theme["--ft-font-scale"]).toBe("1.3");
    expect(out.patch.appearance.tapeMode).toBe("word");
    // changes are derived from the resolved options, not the model's
    expect(out.changes.length).toBe(5);
  });

  it("returns empty buckets when the model returns junk", async () => {
    signedIn();
    mockLlm.mockResolvedValue("not an object");
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "whatever" },
    });
    expect(out.patch).toEqual({
      theme: {},
      appearance: {},
      background: {},
      behaviour: {},
    });
    expect(out.changes).toEqual([]);
  });

  it("resolves behaviour option choices", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "Stricter typing.",
      changes: [],
      options: { stopOnError: "on", confidence: "word", strictSpace: true },
    });
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "make it strict" },
    });
    expect(out.patch.behaviour).toEqual({
      stopOnError: true,
      confidence: "word",
      strictSpace: true,
    });
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

  it("ignores invented option values (catalog is the boundary)", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "Custom.",
      changes: [],
      options: { accent: "#bada55", surface: "neon", font: "comic" },
    });
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "neon comic sans" },
    });
    // none of those ids exist in the catalog, so nothing is applied
    expect(out.patch.theme).toEqual({});
    expect(out.changes).toEqual([]);
  });

  it("resolves a randomize request to valid catalog options", async () => {
    signedIn();
    mockLlm.mockResolvedValue({
      summary: "Surprise.",
      changes: [],
      randomize: ["accent", "surface"],
    });
    const out = await callRoute<AiSuggestOutput>(["appearance", "aiSuggest"], {
      input: { prompt: "surprise me" },
    });
    expect(out.patch.theme["--primary"]).toMatch(/^oklch\(/);
    expect(out.patch.theme["--background"]).toMatch(/^oklch\(/);
    expect(out.changes.length).toBe(2);
  });
});
