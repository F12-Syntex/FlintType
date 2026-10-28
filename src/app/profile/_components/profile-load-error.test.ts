import { describe, expect, it } from "vitest";
import { BackendError } from "@/lib/errors";
import { toProfileLoadError } from "./profile-load-error";

describe("toProfileLoadError", () => {
  it("maps auth, not-found and rate-limit codes to their own kinds", () => {
    expect(toProfileLoadError(new BackendError(401, "UNAUTHORIZED", "x"))).toEqual(
      { kind: "signIn" },
    );
    expect(toProfileLoadError(new BackendError(404, "NOT_FOUND", "x"))).toEqual({
      kind: "notFound",
    });
    expect(
      toProfileLoadError(new BackendError(429, "RATE_LIMITED", "x")),
    ).toEqual({ kind: "rateLimited" });
  });

  it("keeps only the code for other backend errors, never the message", () => {
    const out = toProfileLoadError(
      new BackendError(500, "INTERNAL", "Missing Clerk Secret Key"),
    );
    expect(out).toEqual({ kind: "other", code: "INTERNAL" });
    expect(JSON.stringify(out)).not.toContain("Clerk");
  });

  it("treats non-backend throws as an unknown failure", () => {
    expect(toProfileLoadError(new Error("boom"))).toEqual({
      kind: "other",
      code: null,
    });
    expect(toProfileLoadError("nope")).toEqual({ kind: "other", code: null });
  });
});
