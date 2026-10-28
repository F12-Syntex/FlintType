import { EmailLinkErrorCode } from "@clerk/nextjs/errors";
import { describe, expect, it } from "vitest";
import { explainLinkError, precheck, statusAfterVerify } from "./verify-status";

const linkError = (code: string) => Object.assign(new Error(code), { code });

describe("precheck", () => {
  it("rejects a link with neither a status nor a ticket", () => {
    const out = precheck("", "ready");
    expect(out?.kind).toBe("error");
    expect(out && "message" in out ? out.message : "").toMatch(/incomplete/);
    expect(precheck("?foo=1", "loading")?.kind).toBe("error");
  });

  it("goes ahead with Clerk's link params, even before Clerk has loaded", () => {
    expect(precheck("?__clerk_status=expired", "loading")).toBeNull();
    expect(precheck("?__clerk_status=verified", "ready")).toBeNull();
    expect(precheck("?__clerk_ticket=abc", "degraded")).toBeNull();
  });

  it("says Clerk can't be reached when it failed to load", () => {
    const out = precheck("?__clerk_status=verified", "error");
    expect(out?.kind).toBe("error");
    expect(out && "message" in out ? out.message : "").toMatch(/couldn't reach/);
  });
});

describe("statusAfterVerify", () => {
  it("is signed in here when the link's new session is now active", () => {
    expect(
      statusAfterVerify(
        "?__clerk_status=verified&__clerk_created_session=sess_1",
        "sess_1",
      ),
    ).toEqual({ kind: "signed-in" });
  });

  it("sends the user back to the original tab otherwise", () => {
    // Verified on another device: no session here.
    expect(
      statusAfterVerify("?__clerk_status=verified&__clerk_created_session=sess_1", null),
    ).toEqual({ kind: "elsewhere" });
    // Already signed in here with a different session.
    expect(
      statusAfterVerify(
        "?__clerk_status=verified&__clerk_created_session=sess_1",
        "sess_other",
      ),
    ).toEqual({ kind: "elsewhere" });
    // No session was created by the link (e.g. a further step is needed).
    expect(statusAfterVerify("?__clerk_status=verified", "sess_1")).toEqual({
      kind: "elsewhere",
    });
    expect(statusAfterVerify("?__clerk_status=transferable", undefined)).toEqual({
      kind: "elsewhere",
    });
  });
});

describe("explainLinkError", () => {
  it("explains each email-link failure", () => {
    expect(explainLinkError(linkError(EmailLinkErrorCode.Expired))).toMatch(/expired/);
    expect(explainLinkError(linkError(EmailLinkErrorCode.Failed))).toMatch(
      /Verification failed/,
    );
    expect(explainLinkError(linkError(EmailLinkErrorCode.ClientMismatch))).toMatch(
      /different device or browser/,
    );
  });

  it("falls back to Clerk's message, then the error, then a generic line", () => {
    expect(
      explainLinkError({ errors: [{ longMessage: "Long", message: "Short" }] }),
    ).toBe("Long");
    expect(explainLinkError({ errors: [{ message: "Short" }] })).toBe("Short");
    expect(explainLinkError(new Error("Network down"))).toBe("Network down");
    expect(explainLinkError(new Error(""))).toBe(
      "Something went wrong verifying the link.",
    );
    expect(explainLinkError(null)).toBe("Something went wrong verifying the link.");
  });
});
