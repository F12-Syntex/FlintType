import { describe, expect, it } from "vitest";
import { UPDATES, getUpdate, updateForVersion } from "./updates";

describe("updates registry", () => {
  it("has unique slugs", () => {
    const slugs = UPDATES.map((u) => u.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("getUpdate resolves a known slug and misses cleanly", () => {
    expect(getUpdate("friends-and-profile")?.title).toBe("Friends & Profile");
    expect(getUpdate("nope")).toBeUndefined();
  });

  it("updateForVersion maps a covered changelog version to its card", () => {
    expect(updateForVersion("6.96.0")?.slug).toBe("friends-and-profile");
    expect(updateForVersion("0.0.1")).toBeUndefined();
  });
});
