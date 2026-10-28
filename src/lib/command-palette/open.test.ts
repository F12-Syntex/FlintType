import { afterEach, describe, expect, it, vi } from "vitest";
import {
  commandKeyLabel,
  OPEN_COMMAND_PALETTE_EVENT,
  openCommandPalette,
} from "./open";

describe("openCommandPalette", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a no-op outside the browser", () => {
    expect(() => openCommandPalette()).not.toThrow();
  });

  it("dispatches the open event on window", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const listener = vi.fn();
    target.addEventListener(OPEN_COMMAND_PALETTE_EVENT, listener);
    openCommandPalette();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("commandKeyLabel", () => {
  it("shows the command glyph on Apple platforms", () => {
    expect(commandKeyLabel("MacIntel")).toBe("⌘");
    expect(commandKeyLabel("iPhone")).toBe("⌘");
  });

  it("shows Ctrl elsewhere", () => {
    expect(commandKeyLabel("Win32")).toBe("Ctrl");
    expect(commandKeyLabel("Linux x86_64")).toBe("Ctrl");
    expect(commandKeyLabel("")).toBe("Ctrl");
  });
});
