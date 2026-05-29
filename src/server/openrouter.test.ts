import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@/lib/errors";

// Mock the env module so we can flip OPENROUTER_API_KEY per test without
// touching process.env (env.ts parses once at import).
const { keyRef } = vi.hoisted(() => ({ keyRef: { value: "test-key" } }));
vi.mock("@/server/env", () => ({
  env: {
    get OPENROUTER_API_KEY() {
      return keyRef.value;
    },
  },
}));

import { openRouterJson } from "./openrouter";

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

function jsonResponse(content: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

describe("openRouterJson", () => {
  beforeEach(() => {
    keyRef.value = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when the API key is missing", async () => {
    keyRef.value = "";
    await expect(
      openRouterJson({ system: "s", user: "u" }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("returns the parsed JSON from the model reply", async () => {
    mockFetch(() => jsonResponse('{"theme":{"--primary":"#0f0"}}'));
    const out = await openRouterJson({ system: "s", user: "u" });
    expect(out).toEqual({ theme: { "--primary": "#0f0" } });
  });

  it("throws on a non-2xx response", async () => {
    mockFetch(() => jsonResponse("{}", false, 502));
    await expect(
      openRouterJson({ system: "s", user: "u" }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("throws when the model content is missing", async () => {
    mockFetch(
      () => ({ ok: true, status: 200, json: async () => ({}) }) as Response,
    );
    await expect(
      openRouterJson({ system: "s", user: "u" }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("throws when the model content is not valid JSON", async () => {
    mockFetch(() => jsonResponse("not json"));
    await expect(
      openRouterJson({ system: "s", user: "u" }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("throws when fetch itself rejects", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    await expect(
      openRouterJson({ system: "s", user: "u" }),
    ).rejects.toBeInstanceOf(BackendError);
  });
});
