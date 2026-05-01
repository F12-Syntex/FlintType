import { describe, expect, it } from "vitest";
import { getAppVersion } from "./version";

describe("getAppVersion", () => {
  it("returns the trimmed semver from the project VERSION file", () => {
    expect(getAppVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
