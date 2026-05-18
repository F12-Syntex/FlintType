import { describe, expect, it } from "vitest";

import { deriveUsernameCandidate } from "./auto-username";

describe("deriveUsernameCandidate", () => {
  it("uses the email local-part when present", () => {
    expect(
      deriveUsernameCandidate({
        email: "syntex@example.com",
        userId: "user_abc123",
      }),
    ).toBe("syntex");
  });

  it("replaces dots and non-word chars in the local-part with underscores", () => {
    expect(
      deriveUsernameCandidate({
        email: "eng.saifkhan2003@gmail.com",
        userId: "user_x",
      }),
    ).toBe("eng_saifkhan2003");
    expect(
      deriveUsernameCandidate({
        email: "first+last.tag@x.com",
        userId: "user_x",
      }),
    ).toBe("first_last_tag");
  });

  it("strips leading and trailing underscores produced by sanitisation", () => {
    expect(
      deriveUsernameCandidate({
        email: ".hidden.@x.com",
        userId: "user_xxxxxxxxxxxx",
      }),
    ).toBe("hidden");
  });

  it("falls back to first+last name when the email is too short", () => {
    expect(
      deriveUsernameCandidate({
        email: "bo@x.com",
        firstName: "Alice",
        lastName: "Liddell",
        userId: "user_xxxxxxxx",
      }),
    ).toBe("aliceliddell");
  });

  it("falls back to the userId slug when nothing else is usable", () => {
    expect(
      deriveUsernameCandidate({
        email: null,
        firstName: null,
        lastName: null,
        userId: "user_3D4YUrZzKXM1NKk5tjYtUmKMt4v",
      }),
    ).toBe("u_3d4yurzzkxm1");
  });

  it("clamps to 30 characters", () => {
    const result = deriveUsernameCandidate({
      email:
        "averylongemaillocalpartthatdefinitelyexceedsthirtycharacters@example.com",
      userId: "user_x",
    });
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toBe("averylongemaillocalpartthatdef");
  });

  it("lowercases mixed-case emails", () => {
    expect(
      deriveUsernameCandidate({
        email: "SyntexUser@Example.COM",
        userId: "user_x",
      }),
    ).toBe("syntexuser");
  });
});
