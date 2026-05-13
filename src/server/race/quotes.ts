import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Server-side quote pool used by the QUOTE race mode. Reads the
 *  same monkeytype english.json shipped to the client at
 *  /public/quotes/monkeytype/english.json, filters to the medium
 *  length bracket (101–300 chars — keeps races in the 30–60 s zone
 *  for most racers), and excludes anything mentioning "god" per the
 *  project-wide content rule.
 *
 *  Loaded lazily on first call and cached for the lifetime of the
 *  Node process. The file is ~2.3 MB but the parsed pool we keep is
 *  much smaller after filtering — typically a few hundred quotes. */

type Quote = {
  text: string;
  source: string;
  length: number;
  id: number;
};

const MEDIUM_MIN = 101;
const MEDIUM_MAX = 300;
const QUOTES_PATH = join(
  process.cwd(),
  "public",
  "quotes",
  "monkeytype",
  "english.json",
);

let pool: Quote[] | null = null;

/** Synthesised fallback used when the english.json file isn't
 *  reachable from the runtime (e.g. a misconfigured deploy). The
 *  fallback isn't meant to be a real curated set — it's a smoke-test
 *  so quote rooms still launch instead of 500-ing. Pick a curated
 *  pool offline before relying on this in production. */
const FALLBACK: ReadonlyArray<Quote> = [
  {
    id: 0,
    length: 132,
    text: "You miss 100% of the shots you don't take, and the ones you do take only count if you set your feet, look up, and follow through.",
    source: "Fallback",
  },
  {
    id: 1,
    length: 138,
    text: "The fastest way out of a slump is to pick the next small thing you can finish cleanly and finish it, then stack another, then another.",
    source: "Fallback",
  },
];

function loadPool(): Quote[] {
  if (pool) return pool;
  try {
    const raw = readFileSync(QUOTES_PATH, "utf-8");
    const data = JSON.parse(raw) as { quotes: Quote[] };
    pool = data.quotes
      .filter((q) => q.length >= MEDIUM_MIN && q.length <= MEDIUM_MAX)
      .filter((q) => !/\bgod\b/i.test(q.text));
    if (pool.length === 0) pool = FALLBACK.slice();
  } catch {
    // File missing / unreadable — fall back so room creation still
    // succeeds. The dispatcher logger doesn't need to fire here; the
    // failure is observable from the user landing on a Fallback
    // attribution.
    pool = FALLBACK.slice();
  }
  return pool;
}

export type RaceQuote = { text: string; source: string };

/** Pick a random medium-length quote for a new race room. */
export function pickRaceQuote(): RaceQuote {
  const p = loadPool();
  const q = p[Math.floor(Math.random() * p.length)]!;
  return { text: q.text, source: q.source };
}
