import { describe, expect, it } from "vitest";
import { BackendError } from "@/lib/errors";
import { bannedPatterns } from "@/lib/copy-rules";
import { loadErrorLine, toLoadError } from "./load-error";

describe("toLoadError", () => {
  it("maps sign-in, rate limits and other codes", () => {
    expect(toLoadError(new BackendError(401, "UNAUTHORIZED", "no"))).toEqual({ kind: "signIn" });
    expect(toLoadError(new BackendError(429, "RATE_LIMITED", "slow"))).toEqual({ kind: "rateLimited" });
    expect(toLoadError(new BackendError(500, "INTERNAL", "boom"))).toEqual({ kind: "other", code: "INTERNAL" });
    expect(toLoadError(new TypeError("Failed to fetch"))).toEqual({ kind: "other", code: null });
  });
});

describe("loadErrorLine", () => {
  it("gives one line per kind, with the code when there is one", () => {
    expect(loadErrorLine({ kind: "signIn" })).toBe("Sign in to see your insights.");
    expect(loadErrorLine({ kind: "rateLimited" })).toBe("Too many refreshes in a row. Wait a moment, then try again.");
    expect(loadErrorLine({ kind: "other", code: "INTERNAL" })).toBe("Error code: INTERNAL.");
    expect(loadErrorLine({ kind: "other", code: null })).toBe("Check your connection, then try again.");
  });
  it("passes the copy rules", () => {
    for (const e of [{ kind: "signIn" }, { kind: "rateLimited" }, { kind: "other", code: "NOT_FOUND" }, { kind: "other", code: null }] as const) {
      expect(bannedPatterns(loadErrorLine(e))).toEqual([]);
    }
  });
});
