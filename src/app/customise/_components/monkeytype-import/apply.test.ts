import { beforeEach, describe, expect, it, vi } from "vitest";

const stored: Record<string, Record<string, unknown>> = {};

vi.mock("@/lib/prefs-store", () => ({
  readSlice: vi.fn((key: string, defaults: object) => ({ ...defaults, ...stored[key] })),
  writeSlice: vi.fn(),
}));

import { DEFAULT_APPEARANCE } from "@/lib/appearance-prefs";
import { writeSlice } from "@/lib/prefs-store";
import { applyGroup, readCurrentSettings } from "./apply";

const mockWrite = vi.mocked(writeSlice);

beforeEach(() => {
  mockWrite.mockReset();
  for (const k of Object.keys(stored)) delete stored[k];
});

describe("applyGroup", () => {
  it("keeps every setting the import doesn't list", () => {
    // The old importer wrote the defaults plus the MonkeyType fields,
    // which reset everything else in the slice.
    stored.appearance = { borders: "hidden", uiScale: "large", keymap: "react" };
    applyGroup({
      id: "keyboard",
      title: "Keyboard",
      rows: [],
      patches: { appearance: { keymap: "next" } },
    });
    const [slice, value, fields] = mockWrite.mock.calls[0]!;
    expect(slice).toBe("appearance");
    expect(value).toMatchObject({ borders: "hidden", uiScale: "large", keymap: "next" });
    expect(fields).toEqual(["keymap"]);
  });

  it("merges the practice slice onto what is stored, keeping adapt", () => {
    stored.practice = { mode: "WORDS", length: 25, adapt: false, wordlist: "code_go" };
    applyGroup({
      id: "test",
      title: "Your test",
      rows: [],
      patches: { practice: { mode: "TIME", length: 15 } },
    });
    expect(mockWrite).toHaveBeenCalledWith(
      "practice",
      { mode: "TIME", length: 15, adapt: false, wordlist: "code_go" },
      ["mode", "length"],
    );
  });

  it("writes each slice a group touches once", () => {
    applyGroup({
      id: "behaviour",
      title: "Behaviour",
      rows: [],
      patches: {
        behaviour: { strictSpace: true },
        audio: { keypressClickEnabled: true, keypressClickVolume: 30 },
      },
    });
    expect(mockWrite.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      ["behaviour", ["strictSpace"]],
      ["audio", ["keypressClickEnabled", "keypressClickVolume"]],
    ]);
  });
});

describe("readCurrentSettings", () => {
  it("reads stored values over the defaults", () => {
    stored.appearance = { keymap: "off" };
    const now = readCurrentSettings();
    expect(now.appearance).toEqual({ ...DEFAULT_APPEARANCE, keymap: "off" });
    expect(now.practice.wordlist).toBe("english");
  });
});
