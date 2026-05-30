import { describe, expect, it } from "vitest";
import type { AppearancePatch } from "@/types/appearance-ai";
import { mergePatch, overlayCurrent } from "./patch-merge";

const empty = (): AppearancePatch => ({ theme: {}, appearance: {}, background: {} });

describe("mergePatch", () => {
  it("keeps earlier keys and lets later keys win", () => {
    const a: AppearancePatch = {
      ...empty(),
      theme: { "--primary": "red", "--background": "white" },
    };
    const b: AppearancePatch = {
      ...empty(),
      theme: { "--primary": "blue" },
      appearance: { tapeMode: "word" },
    };
    const m = mergePatch(a, b);
    expect(m.theme).toEqual({ "--primary": "blue", "--background": "white" });
    expect(m.appearance).toEqual({ tapeMode: "word" });
  });
});

describe("overlayCurrent", () => {
  it("overlays a patch onto the current snapshot", () => {
    const current = {
      theme: { "--background": "white", "--primary": "red" },
      appearance: { tapeMode: "off" as const },
    };
    const patch: AppearancePatch = {
      ...empty(),
      theme: { "--primary": "blue" },
      appearance: { tapeMode: "word" },
    };
    const out = overlayCurrent(current, patch);
    expect(out.theme).toEqual({ "--background": "white", "--primary": "blue" });
    expect(out.appearance).toEqual({ tapeMode: "word" });
  });

  it("handles an undefined current", () => {
    const patch: AppearancePatch = { ...empty(), theme: { "--primary": "blue" } };
    expect(overlayCurrent(undefined, patch).theme).toEqual({ "--primary": "blue" });
  });
});
