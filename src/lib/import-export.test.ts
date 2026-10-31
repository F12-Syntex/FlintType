import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prefs-store", () => ({
  loadPrefs: vi.fn(async () => ({})),
  getCache: vi.fn(() => ({})),
  writeSlice: vi.fn(),
}));

import { writeSlice } from "./prefs-store";
import { importFlinttype } from "./import-export";

const mockWrite = vi.mocked(writeSlice);

beforeEach(() => {
  mockWrite.mockReset();
});

const writes = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const call of mockWrite.mock.calls) {
    out[call[0] as string] = call[1];
  }
  return out;
};

describe("importFlinttype", () => {
  it("rejects payloads without the flinttype marker", () => {
    expect(() => importFlinttype({})).toThrowError(/flinttype export/i);
    expect(() => importFlinttype({ app: "monkeytype", version: 1, slices: {} }))
      .toThrowError(/flinttype export/i);
  });

  it("writes every recognized slice from the export", () => {
    // Behaviour slice now only carries fields flinttype still
    // recognises — `difficulty` was dropped along with the length-skew
    // word filter. The importer trusts whatever the slice contains and
    // writes it as-is, so use a still-supported field for the test.
    const n = importFlinttype({
      app: "flinttype",
      version: 1,
      exportedAt: "2026-01-01T00:00:00Z",
      slices: {
        caret: { style: "block" },
        behaviour: { confidence: "word" },
        unknown: { ignored: true },
      },
    });
    expect(n).toBe(2);
    const w = writes();
    expect(w.caret).toEqual({ style: "block" });
    expect(w.behaviour).toEqual({ confidence: "word" });
    expect(w.unknown).toBeUndefined();
  });
});
