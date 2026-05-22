import { describe, expect, it } from "vitest";
import {
  DEV_SELF_GRANT_ENABLED,
  devSelfGrantTags,
} from "./dev-tag-grant";
import { OWNER_EMAILS } from "./owner-config";

const owner = OWNER_EMAILS[0]!;

describe("devSelfGrantTags", () => {
  it("returns [] when not enabled, even for the owner", () => {
    expect(devSelfGrantTags({ email: owner, enabled: false })).toEqual([]);
  });

  it("grants whitehat to the owner when enabled", () => {
    expect(devSelfGrantTags({ email: owner, enabled: true })).toEqual([
      "whitehat",
    ]);
  });

  it("is case-insensitive on the owner email", () => {
    expect(
      devSelfGrantTags({ email: owner.toUpperCase(), enabled: true }),
    ).toEqual(["whitehat"]);
  });

  it("returns [] for a non-owner even when enabled", () => {
    expect(
      devSelfGrantTags({ email: "stranger@example.com", enabled: true }),
    ).toEqual([]);
  });

  it("returns [] on null / undefined email", () => {
    expect(devSelfGrantTags({ email: null, enabled: true })).toEqual([]);
    expect(devSelfGrantTags({ email: undefined, enabled: true })).toEqual([]);
  });
});

describe("DEV_SELF_GRANT_ENABLED", () => {
  it("is false under the test runner so prod-side eligibility is deterministic", () => {
    expect(DEV_SELF_GRANT_ENABLED).toBe(false);
  });
});
