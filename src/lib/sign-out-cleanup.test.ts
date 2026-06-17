// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearUserScopedStorage,
  selectUserScopedKeys,
} from "./sign-out-cleanup";

describe("sign-out-cleanup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("selectUserScopedKeys picks exact keys and prefixed keys only", () => {
    const keys = [
      "ft:avg-wpm-samples",
      "ft:pb:time|30",
      "ft:pb:words|50",
      "ft:customise:preview-open:caret",
      "unrelated",
    ];
    expect(selectUserScopedKeys(keys)).toEqual([
      "ft:avg-wpm-samples",
      "ft:pb:time|30",
      "ft:pb:words|50",
    ]);
  });

  it("clearUserScopedStorage removes PB + avg-wpm keys, leaves others", () => {
    localStorage.setItem("ft:pb:time|30", "92");
    localStorage.setItem("ft:pb:quote|0", "70");
    localStorage.setItem("ft:avg-wpm-samples", "[60,70]");
    localStorage.setItem("ft:customise:preview-open:caret", "true");
    localStorage.setItem("theme", "dark");

    clearUserScopedStorage();

    expect(localStorage.getItem("ft:pb:time|30")).toBeNull();
    expect(localStorage.getItem("ft:pb:quote|0")).toBeNull();
    expect(localStorage.getItem("ft:avg-wpm-samples")).toBeNull();
    expect(localStorage.getItem("ft:customise:preview-open:caret")).toBe(
      "true",
    );
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("clearUserScopedStorage is a no-op on an empty storage", () => {
    expect(() => clearUserScopedStorage()).not.toThrow();
    expect(localStorage.length).toBe(0);
  });
});
