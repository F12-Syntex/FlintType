import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOBBY_CONFIG,
  lobbyConfigSummary,
  loadLobbyConfig,
  quoteLengthLabel,
  toggleQuoteLength,
  type LobbyConfig,
} from "./lobby-config";

const cfg = (over: Partial<LobbyConfig> = {}): LobbyConfig => ({
  ...DEFAULT_LOBBY_CONFIG,
  ...over,
});

describe("quoteLengthLabel", () => {
  it("names every bucket in plain English", () => {
    expect([0, 1, 2, 3].map(quoteLengthLabel)).toEqual([
      "short",
      "medium",
      "long",
      "extra long",
    ]);
  });
});

describe("lobbyConfigSummary", () => {
  it("describes the default quote range", () => {
    expect(lobbyConfigSummary(cfg(), "English")).toBe("Quote race, short to long");
  });

  it("handles a single bucket and a gapped selection", () => {
    expect(lobbyConfigSummary(cfg({ quoteLengths: [1] }), "English")).toBe(
      "Quote race, medium only",
    );
    expect(lobbyConfigSummary(cfg({ quoteLengths: [3, 0] }), "English")).toBe(
      "Quote race, short and extra long",
    );
    expect(lobbyConfigSummary(cfg({ quoteLengths: [0, 1, 3] }), "English")).toBe(
      "Quote race, short, medium and extra long",
    );
  });

  it("describes word and timed races with the word list", () => {
    expect(
      lobbyConfigSummary(cfg({ type: "words", wordCount: 50 }), "English 1k"),
    ).toBe("50 words from English 1k");
    expect(
      lobbyConfigSummary(cfg({ type: "timed", durationSec: 15 }), "English"),
    ).toBe("15 second race from English");
  });
});

describe("toggleQuoteLength", () => {
  it("adds and removes buckets, keeping them sorted", () => {
    const added = toggleQuoteLength(cfg({ quoteLengths: [2] }), 0);
    expect(added.quoteLengths).toEqual([0, 2]);
    expect(toggleQuoteLength(added, 2).quoteLengths).toEqual([0]);
  });

  it("never clears the last bucket", () => {
    const one = cfg({ quoteLengths: [1] });
    expect(toggleQuoteLength(one, 1)).toBe(one);
  });
});

describe("loadLobbyConfig", () => {
  it("returns the default outside the browser", () => {
    expect(loadLobbyConfig()).toEqual(DEFAULT_LOBBY_CONFIG);
  });
});
