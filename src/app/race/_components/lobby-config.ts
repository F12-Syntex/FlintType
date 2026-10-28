import { DEFAULT_WORDLIST, type WordlistId } from "@/lib/wordlists/use-wordlist";
import { DEFAULT_RACE_QUOTE_LENGTHS } from "@/types/race";

export const WORD_COUNTS = [10, 25, 50, 100] as const;
export const DURATIONS = [15, 30, 60] as const;

export type LobbyType = "quote" | "words" | "timed";

/** Persisted lobby-creation config. Pressing "Create private lobby"
 *  fires instantly with whatever's saved here; the gear opens the
 *  editor. */
export type LobbyConfig = {
  type: LobbyType;
  /** Quote length buckets (ids into RACE_QUOTE_GROUPS) for a quote race. */
  quoteLengths: number[];
  wordCount: number;
  durationSec: number;
  wordlistId: WordlistId;
};

export const LOBBY_CONFIG_STORAGE_KEY = "ft:race:lobby-config";

/** A fresh lobby is a small-to-large quote race (short..long). */
export const DEFAULT_LOBBY_CONFIG: LobbyConfig = {
  type: "quote",
  quoteLengths: [...DEFAULT_RACE_QUOTE_LENGTHS],
  wordCount: 25,
  durationSec: 30,
  wordlistId: DEFAULT_WORDLIST,
};

/** Read the saved config, coercing anything unexpected back to the
 *  default so a hand-edited / stale localStorage value can't wedge the
 *  control. Returns the default on the server (no localStorage). */
export function loadLobbyConfig(): LobbyConfig {
  if (typeof window === "undefined") return DEFAULT_LOBBY_CONFIG;
  try {
    const raw = window.localStorage.getItem(LOBBY_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_LOBBY_CONFIG;
    const p = JSON.parse(raw) as Partial<LobbyConfig>;
    const lengths = Array.isArray(p.quoteLengths)
      ? p.quoteLengths.filter((n) => Number.isInteger(n) && n >= 0 && n <= 3)
      : [];
    return {
      type: p.type === "words" || p.type === "timed" ? p.type : "quote",
      quoteLengths: lengths.length
        ? lengths
        : [...DEFAULT_RACE_QUOTE_LENGTHS],
      wordCount: (WORD_COUNTS as readonly number[]).includes(p.wordCount as number)
        ? (p.wordCount as number)
        : 25,
      durationSec: (DURATIONS as readonly number[]).includes(p.durationSec as number)
        ? (p.durationSec as number)
        : 30,
      wordlistId: (p.wordlistId as WordlistId) ?? DEFAULT_WORDLIST,
    };
  } catch {
    return DEFAULT_LOBBY_CONFIG;
  }
}

/** Toggle one quote-length bucket, never clearing the last one — a
 *  quote race always needs at least one length to draw from (the server
 *  requires min 1). */
export function toggleQuoteLength(config: LobbyConfig, id: number): LobbyConfig {
  const next = config.quoteLengths.includes(id)
    ? config.quoteLengths.filter((n) => n !== id)
    : [...config.quoteLengths, id];
  if (next.length === 0) return config;
  return { ...config, quoteLengths: next.sort((a, b) => a - b) };
}
