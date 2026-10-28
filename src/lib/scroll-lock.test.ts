// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { lockBodyScroll } from "./scroll-lock";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("lockBodyScroll", () => {
  it("locks, then restores the original value", () => {
    document.body.style.overflow = "auto";
    const release = lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    release();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("stays locked until the last overlapping lock is released", () => {
    const sheet = lockBodyScroll();
    const dialog = lockBodyScroll();
    sheet(); // the sheet finishes closing while the dialog is still up
    expect(document.body.style.overflow).toBe("hidden");
    dialog();
    expect(document.body.style.overflow).toBe("");
  });

  it("ignores a second release", () => {
    const a = lockBodyScroll();
    const b = lockBodyScroll();
    a();
    a();
    expect(document.body.style.overflow).toBe("hidden");
    b();
    expect(document.body.style.overflow).toBe("");
  });
});
