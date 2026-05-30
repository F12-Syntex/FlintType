import { describe, expect, it } from "vitest";
import { buildUserMessage } from "./prompt";

describe("buildUserMessage", () => {
  it("embeds the prompt and a current-settings block", () => {
    const msg = buildUserMessage("warmer", {
      theme: { "--background": "oklch(0.95 0.02 85)" },
    });
    expect(msg).toContain("Current settings");
    expect(msg).toContain("Request: warmer");
    expect(msg).toContain("oklch(0.95 0.02 85)");
  });

  it("trims unknown keys from the current state", () => {
    const msg = buildUserMessage("x", {
      theme: { "--background": "white", "--evil": "boom" },
      appearance: { tapeMode: "word", bogus: "x" } as Record<
        string,
        string
      >,
    });
    expect(msg).toContain("--background");
    expect(msg).not.toContain("--evil");
    expect(msg).toContain("tapeMode");
    expect(msg).not.toContain("bogus");
  });

  it("handles a missing current state", () => {
    const msg = buildUserMessage("hello", undefined);
    expect(msg).toContain("Request: hello");
    expect(msg).toContain('"theme":{}');
  });
});
